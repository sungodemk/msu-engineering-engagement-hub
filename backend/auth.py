from functools import wraps 
from flask import g, request, jsonify 
from firebase_admin import auth as fb_auth
from database import get_db_connection 

# Authorize the login of a user (Zhixiang Miao)
def require_login(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "not logged in"}), 401
        try:
            decoded = fb_auth.verify_id_token(header.split(" ", 1)[1])
        except Exception:
            return jsonify({"error": "invalid token"}), 401

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE users SET last_login_at = now()
                    WHERE firebase_uid = %s AND is_active
                    RETURNING id, email, display_name, role, staff_external_id
                """, (decoded["uid"],))
                user = cur.fetchone()

        if not user:
            return jsonify({"error": "no hub account"}), 403
        g.user = user
        return f(*args, **kwargs)
    return wrapper