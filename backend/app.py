import os
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash
from flask_cors import CORS
import uuid
import psycopg
from psycopg.rows import dict_row
from days_calculator.days_calculator import days_passed_calc

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

DATABASE_URL = os.environ["DATABASE_URL"]
def get_db_connection():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


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

# list all people and their current employers (Emmanuel)
@app.route ('/api/persons')
def list_persons():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    p.id,
                    p.display_name,
                    p.email,
                    COALESCE(emp.edge_role, p.attributes->>'title') AS title,
                    emp.company_id,
                    emp.company,
                    emp.employer_type,
                    emp.since
                FROM live_entities p
                LEFT JOIN LATERAL (
                    SELECT 
                        c.id AS company_id,
                        c.display_name AS company,
                        c.entity_type AS employer_type,
                        e.edge_role,
                        e.valid_from::text AS since
                    FROM edges e
                    JOIN entities c ON c.id = e.to_entity_id
                    WHERE e.from_entity_id = p.id
                      AND e.edge_type = 'employed_by'
                      AND e.valid_to IS NULL
                    ORDER BY e.valid_from DESC
                    LIMIT 1
                ) emp ON true
                WHERE p.entity_type = 'person'
                ORDER BY p.display_name
            """)
            rows = cur.fetchall()
    return jsonify(rows)

# everything for the Persons page in one response (Emmanuel)
@app.route('/api/persons/<person_id>')
def get_person(person_id):
    try:
        uuid.UUID(person_id)
    except ValueError:
        return jsonify({"ERROR":"Person not found"}), 404

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, display_name, email, attributes
                FROM live_entities
                WHERE id = %s AND entity_type = 'person'
            """, (person_id,))
            person = cur.fetchone()
            if person is None:
                return jsonify({"ERROR": "Person not Found"}), 404
            
            # dates as text
            cur.execute("""
                SELECT c.id, c.display_name AS company, e.edge_role AS title,
                        e.valid_from::text AS valid_from, e.valid_to::text AS valid_to
                FROM edges e 
                JOIN entities c ON c.id = e.to_entity_id
                WHERE e.from_entity_id = %s AND e.edge_type = 'employed_by'
                ORDER BY e.valid_to IS NULL DESC, e.valid_from DESC
            """, (person_id,))
            affiliations = cur.fetchall()

            cur.execute("""
                SELECT a.id, a.activity_type, a.occurred_on::text AS occurred_on,
                        a.amount::float AS amount, a.status, a.notes,
                        c.display_name AS company
                FROM activities a 
                LEFT JOIN entities c ON c.id = a.company_entity_id
                WHERE a.person_entity_id = %s
                ORDER BY a.occurred_on DESC
            """,(person_id,))
            activities = cur.fetchall()

    return jsonify({
        "person":person,
        "current_affiliation": next((a for a in affiliations if a["valid_to"] is None), None),
        "affiliations": affiliations,
        "activities": activities,

    })



@app.route("/api/days_passed/start_date")
def count_days():
    start_date = "Jan 1, 2026"
    days_passed = days_passed_calc(start_date)
    return jsonify({"days_passed": days_passed})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), use_reloader=True)