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


# List all companies (Alvin)
@app.route('/api/companies')
def list_companies():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, display_name,
                attributes ->> 'industry' AS industry,
                attributes ->> 'city' AS city,
                attributes ->> 'state' AS state,
                attributes ->> 'parent_external_id' AS parent,
                attributes ->> 'latest_contact_date' AS latest_contact_date,
                attributes ->> 'total_giving_amount' AS total_giving_amount
                FROM entities WHERE entity_type = 'organization'
                ORDER BY display_name
            """)
            rows = cur.fetchall()
    for company in rows:
        if company['latest_contact_date']:
            company['days_passed'] = days_passed_calc(company['latest_contact_date'])
        else:
            company['days_passed'] = None

    return jsonify(rows)

# Look up a company by ID (Alvin)
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

# Get temporal activities for a company (Alvin)
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
                        e.valid_from::text AS valid_from, e.valid_to::text AS valid_to,
                        (e.valid_to - 1)::text AS last_day
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

# Queries everything needed for the Portfolio page in one response (Alvin)
@app.route('/api/portfolio')
def portfolio():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Owner comes from most recent activity with a non-null owner_entity_id.
            cur.execute("""WITH giving AS (
                    SELECT company_entity_id, SUM(amount) AS total_giving
                    FROM activities
                    WHERE activity_type = 'gift'
                    GROUP BY company_entity_id ),
                research AS (
                    SELECT company_entity_id, COUNT(*) AS active_research
                    FROM activities
                    WHERE activity_type = 'award'
                      AND (ended_on IS NULL OR ended_on >= CURRENT_DATE)
                    GROUP BY company_entity_id ),
                recruiting AS (
                    SELECT company_entity_id, COUNT(*) AS recruiting_volume
                    FROM activities
                    WHERE activity_type = 'recruiting'
                    GROUP BY company_entity_id ),
                last_activity AS (
                    SELECT company_entity_id, MAX(occurred_on) AS last_activity_date
                    FROM activities
                    GROUP BY company_entity_id ),
                latest_owner AS (
                    SELECT DISTINCT ON (company_entity_id)
                        company_entity_id, owner_entity_id
                    FROM activities
                    WHERE owner_entity_id IS NOT NULL
                    ORDER BY company_entity_id, occurred_on DESC)
                SELECT e.id, e.display_name AS name, e.attributes->>'industry' AS sector,
                    owner.display_name AS owner, la.last_activity_date,
                    COALESCE(g.total_giving, 0) AS total_giving,
                    COALESCE(r.active_research, 0) AS active_research,
                    COALESCE(rec.recruiting_volume, 0) AS recruiting_volume
                FROM entities e
                LEFT JOIN giving g ON g.company_entity_id = e.id
                LEFT JOIN research r ON r.company_entity_id = e.id
                LEFT JOIN recruiting rec ON rec.company_entity_id = e.id
                LEFT JOIN last_activity la ON la.company_entity_id = e.id
                LEFT JOIN latest_owner lo ON lo.company_entity_id = e.id
                LEFT JOIN entities owner ON owner.id = lo.owner_entity_id
                WHERE e.entity_type = 'organization'
                  AND e.merged_into_id IS NULL
                ORDER BY la.last_activity_date DESC NULLS LAST
            """)
            rows = cur.fetchall()
    return jsonify(rows)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), use_reloader=True)