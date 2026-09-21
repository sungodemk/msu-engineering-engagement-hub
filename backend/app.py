import os
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash
from flask_cors import CORS
import psycopg
from psycopg.rows import dict_row

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

DATABASE_URL = os.environ["DATABASE_URL"]
def get_db_connection():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

@app.route('/')
def root():
    return redirect('/home')

@app.route('/home')
def home():
    return render_template('Homepage.html')

@app.route('/company')
def company():
    return render_template('company_page/company_page.html')

@app.route('/persons')
def persons():
    return render_template('Persons_page.html')

@app.route('/portfolio')
def portfolio():
    return render_template('Portfolio_page.html')

@app.route('/stewardship')
def stewardship():
    return render_template('Stewardship_queue_page.html')

@app.route('/company_page_overview')
def overview():
    return render_template('company_page/overview.html')

# List all companies
@app.route('/api/companies')
def list_companies():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, display_name
                FROM entities WHERE entity_type = 'organization'
                ORDER BY display_name
            """)
            rows = cur.fetchall()
    return jsonify(rows)

# Look up a company by ID
@app.route('/api/companies/<company_id>')
def get_company(company_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, display_name
                FROM entities
                WHERE id = %s AND entity_type = 'organization'
            """, (company_id,))
            row = cur.fetchone()
    if row is None:
        return jsonify({"error": "Company not found"}), 404
    return jsonify(row)

# Get temporal activities for a company
@app.route('/api/companies/<company_id>/temporal')
def temporal(company_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
            SELECT id, activity_type, occurred_on, ended_on, amount, status, notes
            FROM activities WHERE company_entity_id = %s ORDER BY occurred_on """, (company_id,))
            rows = cur.fetchall()
    return jsonify(rows)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), use_reloader=True)