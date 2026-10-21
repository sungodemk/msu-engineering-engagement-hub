from flask import Blueprint, Flask, request, jsonify, render_template, redirect, url_for, session, flash
from flask_cors import CORS
import uuid
import psycopg
from psycopg.rows import dict_row
from days_calculator.days_calculator import days_passed_calc
import json
from datetime import datetime as at
from pytz import timezone
from flask import g, request
from database import get_db_connection

bp = Blueprint('person', __name__)


# list all people and their current employers (Emmanuel)
@bp.route ('/api/persons')
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
                    emp.since,
                    ARRAY(
                        SELECT DISTINCT s.payload->>'awardTypeDescription'
                        FROM activities a 
                        JOIN source_records s ON s.id = a.source_record_id
                        WHERE a.person_entity_id = p.id
                            AND a.activity_type = 'award'
                        ) AS award_types
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
@bp.route('/api/persons/<person_id>')
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

            current = next((a for a in affiliations if a ["valid_to"] is None), None)

            cur.execute("""
                SELECT id, degree_type, major, college, class_year
                FROM degrees
                WHERE person_entity_id = %s
                ORDER BY class_year
            """, (person_id,))
            degrees = cur.fetchall()

            cur.execute("""
                SELECT * FROM(
                SELECT s.id, s.display_name AS name, o.edge_role AS role, 'person' AS source
                FROM edges o 
                JOIN entities s ON s.id = o.from_entity_id
                WHERE o.to_entity_id = %s
                    AND o.edge_type = 'relationship_owner'
                    AND o.valid_to IS NULL
                UNION ALL
                SELECT s.id, s.display_name, o.edge_role, 'company'
                FROM edges o 
                JOIN entities s ON s.id = o.from_entity_id
                WHERE o.to_entity_id = %s
                    AND o.edge_type = 'relationship_owner'
                    AND o.valid_to IS NULL
                ) owners
                ORDER BY source = 'person' DESC, starts_with(role, 'Primary') DESC NULLS LAST LIMIT 1
            """, (person_id, current["id"] if current else None))
            owner = cur.fetchone()

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
        "current_affiliation": current,
        "affiliations": affiliations,
        "degrees": degrees,
        "owner": owner,
        "activities": activities,

    })


# search for people and companies (Emmanuel)
@bp.route('/api/search')
def search():
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify([])

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, display_name AS name, entity_type AS type
                FROM live_entities
                WHERE entity_type IN ('person', 'organization')
                  AND display_name ILIKE %s 
                  AND attributes->>'sponsor_type' IS DISTINCT FROM 'Government'
                ORDER BY starts_with (lower(display_name), lower(%s)) DESC, display_name
                LIMIT 10
            """, (f'%{q}%', q,))
            results = cur.fetchall()

    return jsonify(results)