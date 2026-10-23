import os
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash
from flask_cors import CORS
import uuid
import psycopg
from psycopg.rows import dict_row
import firebase_admin
from firebase_admin import credentials
from firebase_admin import auth as fb_auth
from functools import wraps
from flask import g, request
from database import get_db_connection

from routes.company import bp as company_bp
from routes.person import bp as person_bp
from routes.matching import bp as matching_bp
from routes.portfolio import bp as portfolio_bp
from routes.profile import bp as profile_bp
from auth import require_login

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})


app.register_blueprint(company_bp)
app.register_blueprint(person_bp)
app.register_blueprint(matching_bp)
app.register_blueprint(portfolio_bp)
app.register_blueprint(profile_bp)

FIREBASE_KEY = os.environ.get("FIREBASE_CREDENTIALS", "/app/firebase-key.json")
if not firebase_admin._apps:
    if os.path.exists(FIREBASE_KEY):
        firebase_admin.initialize_app(credentials.Certificate(FIREBASE_KEY))
    else:
        app.logger.warning("Firebase key not found at %s, login will not work")
        firebase_admin.initialize_app(credentials.Certificate(FIREBASE_KEY))




# Validate the login of a user (Zhixiang Miao)
@app.route("/api/me")
@require_login
def me():
    return jsonify(g.user)

# Added sign up algorithm (Zhixiang Miao)
@app.route("/api/sign_up", methods=["POST"])
def sign_up():
    try: 
        data = request.get_json()
    except Exception:
        return jsonify({"error": "Invalid data"}), 400
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid data"}), 400
    email = data.get("email", "")
    password = data.get("password", "")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({"error": "Invalid email or password"}), 400
    
    formattedEmail = email.strip()

    if not formattedEmail:
        return jsonify({"error": "email cannot be empty"}), 400
    if not password:
        return jsonify({"error": "Password cannot be empty"}), 400

    if not (formattedEmail.endswith("@msu.edu") and "@" in formattedEmail):
        return jsonify({"error": "Invalid email format"}), 400

    try:
        user_record = fb_auth.create_user(email=formattedEmail, password=password)
    except fb_auth.EmailAlreadyExistsError:
        return jsonify({"error": "Email already registered"}), 400
    except ValueError:
        return jsonify({"error": "Invalid email or password"}), 400
    except Exception:
        app.logger.error("Failed to create user")
        return jsonify({"error": "Failed to create user"}), 500

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO users (firebase_uid, email, display_name, role, is_active)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (user_record.uid, formattedEmail, formattedEmail.split("@")[0], "viewer", False)) # Get the net id for display_name for now, default to viewer role and inactive account
                user_id = cur.fetchone()['id']
        return jsonify({"message": "Account created successfully, but need the approval of the admin to activate the account", "uid": user_record.uid, "user_id": user_id}), 201

    except psycopg.Error as e:
        app.logger.error("Registering user failed: %s", str(e))
        try: 
            # If an account registration fails, clean up that account. 
            fb_auth.delete_user(user_record.uid)
        except Exception:
            return jsonify({"error": "Failed to clean up user after registration failure"}), 500
        return jsonify({"error": "Registration failed"}), 500

# Retrieve inactive accounts (Zhixiang Miao)
@app.route("/api/inactive_accounts", methods=["GET"])
@require_login
def inactive_accounts():
    if g.user["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, firebase_uid, email, display_name, role, is_active
                    FROM users
                    WHERE is_active = FALSE
                """)
            users = cur.fetchall()
        users_info = []
        for user in users:
            users_info.append({
                "id": user[0],
                "firebase_uid": user[1],
                "email": user[2],
                "display_name": user[3],
                "role": user[4],
                "is_active": user[5]
            })
        return jsonify(users_info)
    except psycopg.Error as e:
        app.logger.error("Fetching inactive accounts failed: %s", str(e))
        return jsonify({"error": "Failed to fetch inactive accounts"}), 500

# Approve the registered but inactive account (Zhixiang Miao)
@app.route("/api/approve_account", methods=["POST"])
@require_login
def approve_account():
    if g.user["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    user_id = data.get("user_id")
    role = data.get("role")
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    if not role:
        return jsonify({"error": "Role is required"}), 400
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE users
                    SET is_active = TRUE,
                        role = %s
                    WHERE id = %s
                """, (role, user_id))
        return jsonify({"message": "Account approved successfully"})
    except psycopg.Error as e:
        app.logger.error("Approving account failed: %s", str(e))
        return jsonify({"error": "Failed to approve account"}), 500

# Deny the registered but inactive account (Zhixiang Miao)
@app.route("/api/deny_account", methods=["POST"])
@require_login
def deny_account():
    if g.user["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid data"}), 400
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    if not isinstance(user_id, str):
        return jsonify({"error": "Invalid User ID type"}), 400
    user_id = user_id.strip()
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        return jsonify({"error": "Invalid User ID"}), 400
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, firebase_uid, is_active FROM users
                    WHERE id = %s
                    FOR UPDATE
                """, (user_uuid,))
                user_record = cur.fetchone()
                if not user_record:
                    return jsonify({"error": "User not found"}), 404
                firebase_uid = user_record[1]
                if user_record[2]:
                    return jsonify({"error": "User is active"}), 409
                cur.execute("""
                    DELETE FROM users
                    WHERE id = %s
                """, (user_uuid,))
                try:
                    firebase_admin.auth.delete_user(firebase_uid)
                except firebase_admin.auth.UserNotFoundError:
                    app.logger.warning("Firebase user not found: %s", firebase_uid)
        return jsonify({"message": "Account denied successfully"})
    except psycopg.Error as e:
        app.logger.error("Denying account failed: %s", str(e))
        return jsonify({"error": "Failed to deny account"}), 500
    except firebase_admin.exceptions.FirebaseError as e:
        app.logger.error("Deleting Firebase user failed: %s", str(e))
        return jsonify({"error": "Failed to delete Firebase user"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), use_reloader=True)