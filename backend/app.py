import os
from pathlib import Path
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash
from flask_cors import CORS
import uuid
import psycopg
from psycopg.rows import dict_row
from days_calculator.days_calculator import days_passed_calc
import json
from datetime import datetime as at
from pytz import timezone
from scripts.load_kuali import read_json_file
from scripts.merge_entities import merge_persons

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

DATABASE_URL = os.environ["DATABASE_URL"]
DEMO_REVIEWER_PK = "STF-003"

def get_db_connection():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


# List all companies (Alvin)
@app.route('/api/companies')
def list_companies():
    with get_db_connection() as conn:
        # Company attributes added by Zhixiang Miao
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, display_name,
                attributes ->> 'industry' AS industry,
                attributes ->> 'city' AS city,
                attributes ->> 'state' AS state,
                attributes ->> 'parent_external_id' AS parent,
                attributes ->> 'latest_contact_date' AS latest_contact_date,
                attributes ->> 'inbound_giving_amount' AS inbound_giving_amount,
                attributes -> 'inbound_giving_counts' AS inbound_giving_counts,
                attributes ->> 'industry_detail' AS industry_detail,
                attributes -> 'activity_timeline' AS activity_timeline,
                attributes -> 'msu_tasks' AS msu_tasks
                FROM live_entities WHERE entity_type = 'organization'
                    AND attributes->>'sponsor_type' IS DISTINCT FROM 'Government'
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
        # Company attributes added by Zhixiang Miao
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, display_name,
                attributes ->> 'industry' AS industry,
                attributes ->> 'city' AS city,
                attributes ->> 'state' AS state,
                attributes ->> 'parent_external_id' AS parent,
                attributes ->> 'latest_contact_date' AS latest_contact_date,
                attributes ->> 'inbound_giving_amount' AS inbound_giving_amount,
                attributes ->> 'outbound_giving_amount' AS outbound_giving_amount,
                attributes -> 'inbound_giving_counts' AS inbound_giving_counts,
                attributes -> 'outbound_giving_counts' AS outbound_giving_counts,
                attributes ->> 'industry_detail' AS industry_detail,
                attributes -> 'activity_timeline' AS activity_timeline,
                attributes -> 'msu_tasks' AS msu_tasks
                FROM live_entities
                WHERE id = %s AND entity_type = 'organization'
            """, (company_id,))
            row = cur.fetchone()
    if row is None:
        return jsonify({"error": "Company not found"}), 404
    if row['latest_contact_date']:
        row['days_passed'] = days_passed_calc(row['latest_contact_date'])
    else:
        row['days_passed'] = None
    return jsonify(row)

# Get the calculated days passed since the last contact date (Zhixiang Miao)
@app.route('/api/days_passed')
def days_passed():
    last_date = request.args.get('last_date')
    if last_date:
        try: 
            days_passed = days_passed_calc(last_date)
        except ValueError:
            days_passed = None
    else:
        days_passed = None
    return jsonify({"days_passed": days_passed})

# Get temporal activities for a company (Alvin)
@app.route('/api/companies/<company_id>/temporal')
def temporal(company_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
            SELECT id, activity_type, sub_type, occurred_on, ended_on, amount, status, notes
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
@app.route('/api/search')
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

# Queries everything needed for the Portfolio page in one response (Alvin)
@app.route('/api/portfolio')
def portfolio():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
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
                -- Get latest owner from edges table that hold primary relationship owner
                latest_owner AS (
                    SELECT DISTINCT ON (to_entity_id)
                        to_entity_id AS company_entity_id,
                        from_entity_id AS owner_entity_id
                    FROM edges
                    WHERE edge_type = 'relationship_owner' AND valid_to IS NULL
                    ORDER BY to_entity_id, valid_from DESC)
                SELECT e.id, e.display_name AS name, e.attributes->>'industry' AS sector,
                    owner.id AS owner_id, owner.display_name AS owner, la.last_activity_date,

                    -- Return total giving amount (Zhixiang Miao). 
                    COALESCE(g.total_giving, 0) AS total_giving,

                    COALESCE(r.active_research, 0) AS active_research,
                    COALESCE(rec.recruiting_volume, 0) AS recruiting_volume
                FROM live_entities e
                LEFT JOIN giving g ON g.company_entity_id = e.id
                LEFT JOIN research r ON r.company_entity_id = e.id
                LEFT JOIN recruiting rec ON rec.company_entity_id = e.id
                LEFT JOIN last_activity la ON la.company_entity_id = e.id
                LEFT JOIN latest_owner lo ON lo.company_entity_id = e.id
                LEFT JOIN entities owner ON owner.id = lo.owner_entity_id
                WHERE e.entity_type = 'organization'
                  AND e.merged_into_id IS NULL
                  AND e.attributes->>'sponsor_type' IS DISTINCT FROM 'Government'
                ORDER BY la.last_activity_date DESC NULLS LAST
            """)
            rows = cur.fetchall()
    return jsonify(rows)

# gets entity matches by status for the stewardship queue pages (Aayush)
def get_matches(cur, status, limit=None):
    query = """
        SELECT
            m.id AS match_id,
            m.score::float AS score,
            m.match_reasons,
            le.entity_type,
            l.source_system AS left_source_system,
            l.source_pk AS left_external_id,
            le.display_name AS left_name,
            le.email AS left_email,
            le.attributes->>'city' AS left_city,
            le.attributes->>'state' AS left_state,
            COALESCE(
                le.attributes->>'record_type',
                le.attributes->>'constituent_type'
            ) AS left_record_type,

            r.source_system AS right_source_system,
            r.source_pk AS right_external_id,
            re.display_name AS right_name,
            re.email AS right_email,
            re.attributes->>'city' AS right_city,
            re.attributes->>'state' AS right_state,
            COALESCE(
                re.attributes->>'record_type',
                re.attributes->>'constituent_type'
            ) AS right_record_type
        FROM entity_matches m
        JOIN source_records l
            ON l.id = m.left_source_record_id
        JOIN entity_source_records lesr
            ON lesr.source_record_id = l.id
        JOIN entities le
            ON le.id = lesr.entity_id
        JOIN source_records r
            ON r.id = m.right_source_record_id
        JOIN entity_source_records resr
            ON resr.source_record_id = r.id
        JOIN entities re
            ON re.id = resr.entity_id
        WHERE m.status = %s
        ORDER BY m.score DESC
    """
    params = [status]

    if limit is not None:
        query += " LIMIT %s"
        params.append(limit)

    cur.execute(query, params)
    return cur.fetchall()


# get pending and recent entity matches for the stewardship queue page (Aayush)
@app.route('/api/stewardship-queue')
def stewardship_queue():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            pending = get_matches(cur, "pending_review")

            cur.execute("""
                SELECT
                    m.id AS match_id,
                    le.display_name AS left_name,
                    re.display_name AS right_name,
                    m.score::float AS score,
                    m.status,
                    COALESCE(reviewer.display_name, 'Auto') AS reviewer,
                    COALESCE(m.reviewed_at, m.created_at)::date::text AS date
                FROM entity_matches m
                JOIN source_records l
                    ON l.id = m.left_source_record_id
                JOIN entity_source_records lesr
                    ON lesr.source_record_id = l.id
                JOIN entities le
                    ON le.id = lesr.entity_id
                JOIN source_records r
                    ON r.id = m.right_source_record_id
                JOIN entity_source_records resr
                    ON resr.source_record_id = r.id
                JOIN entities re
                    ON re.id = resr.entity_id
                LEFT JOIN entities reviewer
                    ON reviewer.id = m.reviewed_by_entity_id
                WHERE m.status IN (
                    'auto_accepted',
                    'confirmed',
                    'rejected'
                )
                ORDER BY COALESCE(m.reviewed_at, m.created_at) DESC
            """)

            recent = cur.fetchall()

    return jsonify({
        "pending": pending,
        "recent": recent,
    })


# get highest scoring discarded matches for possible review (Aayush)
@app.route('/api/stewardship-queue/discarded')
def discarded_matches():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            discarded = get_matches(cur, "auto_rejected", 25)

    return jsonify({
        "discarded": discarded,
    })


# looks up demo reviewer by Salesforce ID until Firebase supplies the logged-in user (Aayush)
def get_reviewer_id(cur):
    cur.execute(
        """
        SELECT e.id
        FROM entities e
        JOIN entity_source_records esr
            ON esr.entity_id = e.id
        JOIN source_records sr
            ON sr.id = esr.source_record_id
        WHERE e.entity_type = 'person'
          AND e.merged_into_id IS NULL
          AND sr.source_system = 'salesforce'
          AND sr.source_pk = %s
        LIMIT 1
        """,
        (DEMO_REVIEWER_PK,),
    )

    reviewer = cur.fetchone()

    if reviewer is None:
        return None

    return reviewer["id"]

# clears duplicate merged mark only if this match merged it (Aayush)
def unmerge_match(cur, match):
    if match["entity_id"] is None:
        return

    cur.execute(
        """
        UPDATE entities e
        SET merged_into_id = NULL
        FROM entity_source_records esr
        WHERE esr.entity_id = e.id
          AND esr.source_record_id IN (%s, %s)
          AND e.merged_into_id = %s
        """,
        (
            match["left_source_record_id"],
            match["right_source_record_id"],
            match["entity_id"],
        ),
    )


# sends a human-reviewed match back to the pending queue (Aayush)
@app.route('/api/matches/<match_id>/undo', methods=['POST'])
def undo_match(match_id):
    try:
        uuid.UUID(match_id)
    except ValueError:
        return jsonify({"error": "Match not found"}), 404

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # locks row so two people can't undo the same match at once
            cur.execute(
                """
                SELECT
                    id,
                    status,
                    entity_id,
                    left_source_record_id,
                    right_source_record_id
                FROM entity_matches
                WHERE id = %s
                FOR UPDATE
                """,
                (match_id,),
            )

            match = cur.fetchone()

            if match is None:
                return jsonify({"error": "Match not found"}), 404

            if match["status"] not in {"confirmed", "rejected"}:
                return jsonify({"error": "Match cannot be undone"}), 409

            unmerge_match(cur, match)

            cur.execute(
                """
                UPDATE entity_matches
                SET
                    status = 'pending_review',
                    entity_id = NULL,
                    reviewed_by_entity_id = NULL,
                    reviewed_at = NULL
                WHERE id = %s
                """,
                (match_id,),
            )

            return jsonify({
                "match_id": match_id,
                "status": "pending_review",
            })

# records reviewer's decision on an entity match (Aayush)
@app.route('/api/matches/<match_id>/decision', methods=['POST'])
def decide_match(match_id):
    try:
        uuid.UUID(match_id)
    except ValueError:
        return jsonify({"error": "Match not found"}), 404

    data = request.get_json(silent=True) or {}
    decision = data.get("decision")

    if decision not in {"accept", "reject"}:
        return jsonify({"error": "Decision must be accept or reject"}), 400

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # locks row so two people can't decide the same match at once
            cur.execute(
                """
                SELECT
                    id,
                    status,
                    left_source_record_id,
                    right_source_record_id
                FROM entity_matches
                WHERE id = %s
                FOR UPDATE
                """,
                (match_id,),
            )

            match = cur.fetchone()

            if match is None:
                return jsonify({"error": "Match not found"}), 404

            if match["status"] not in {"pending_review", "auto_accepted", "auto_rejected"}:
                return jsonify({"error": "Match has already been reviewed"}), 409

            reviewer_id = get_reviewer_id(cur)

            if reviewer_id is None:
                return jsonify({"error": "Demo reviewer not found"}), 500

            if decision == "reject":
                cur.execute(
                    """
                    UPDATE entity_matches
                    SET
                        status = 'rejected',
                        reviewed_by_entity_id = %s,
                        reviewed_at = now(),
                        entity_id = NULL
                    WHERE id = %s
                    """,
                    (
                        reviewer_id,
                        match_id,
                    ),
                )

                return jsonify({
                    "match_id": match_id,
                    "status": "rejected",
                })

            # gets entity and stable source ID behind each side of the match
            cur.execute(
                """
                SELECT
                    e.id,
                    e.entity_type,
                    sr.source_pk,
                    sr.source_system
                FROM entity_source_records esr
                JOIN entities e
                    ON e.id = esr.entity_id
                JOIN source_records sr
                    ON sr.id = esr.source_record_id
                WHERE esr.source_record_id IN (%s, %s)
                """,
                (
                    match["left_source_record_id"],
                    match["right_source_record_id"],
                ),
            )

            entities = cur.fetchall()

            if len(entities) != 2:
                return jsonify({"error": "Match entities could not be resolved"}), 500

            # Salesforce wins across systems; otherwise lower source ID wins
            survivor, duplicate = sorted(
                entities,
                key=lambda entity: (
                    entity["source_system"] != "salesforce",
                    entity["source_pk"],
                ),
            )

            if survivor["entity_type"] != duplicate["entity_type"]:
                return jsonify({"error": "Match entities have different types"}), 409

            if survivor["entity_type"] == "person":
                merge_persons(
                    cur,
                    survivor["id"],
                    duplicate["id"],
                    match_id,
                )
            elif survivor["entity_type"] == "organization":
                merge_companies(
                    cur,
                    survivor["id"],
                    duplicate["id"],
                )
            else:
                return jsonify({"error": "Unsupported entity type"}), 409

            cur.execute(
                """
                UPDATE entity_matches
                SET
                    status = 'confirmed',
                    entity_id = %s,
                    reviewed_by_entity_id = %s,
                    reviewed_at = now()
                WHERE id = %s
                """,
                (
                    survivor["id"],
                    reviewer_id,
                    match_id,
                ),
            )

            return jsonify({
                "match_id": match_id,
                "status": "confirmed",
            })

def merge_companies(cur, survivor_id, duplicate_id):
    # Makes sure there are no connecting edges (there shouldn't be)
    cur.execute(
        """
        DELETE FROM edges
        WHERE (from_entity_id = %(s)s AND to_entity_id = %(d)s)
           OR (from_entity_id = %(d)s AND to_entity_id = %(s)s)
        """,
        {"s": survivor_id, "d": duplicate_id},
    )
    # Moves all activities from the duplicate company to the survivor company
    cur.execute("UPDATE activities SET company_entity_id = %s WHERE company_entity_id = %s",
        (survivor_id, duplicate_id),
    )
    activities_moved = cur.rowcount

    # Moves edges pointing to the duplicate to the survivor
    cur.execute(
        "UPDATE edges SET to_entity_id = %s WHERE to_entity_id = %s",
        (survivor_id, duplicate_id),
    )
    edges_moved = cur.rowcount

    # Moves edges pointing from the company to the duplicate to the survivor
    cur.execute(
        "UPDATE edges SET from_entity_id = %s WHERE from_entity_id = %s",
        (survivor_id, duplicate_id),
    )
    edges_moved += cur.rowcount

    cur.execute(
        "UPDATE entities SET merged_into_id = %s WHERE id = %s",
        (survivor_id, duplicate_id),
    )

    return activities_moved, edges_moved

# Save and display logged activities for a specific company page (Zhixiang Miao)
@app.route("/api/companies/<company_id>/log_activity", methods=["GET", "POST"])
def log_activity(company_id):
    if request.method == "POST":
        data = request.get_json()
        activity_record_type = data.get("activity_record_type")
        stage_name = data.get("stage_name")
        notes = data.get("notes")
        close_date = data.get("close_date")
        if not activity_record_type or not stage_name or not notes or not close_date:
            return jsonify({"error": "Missing required fields"}), 400
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            if request.method == "POST":
                cur.execute("""
                    INSERT INTO log_activity (company_id, activity_record_type, stage_name, notes, close_date)
                    VALUES (%s, %s, %s, %s, %s)
                """, (company_id, activity_record_type, stage_name, notes, close_date))
            cur.execute("""
                SELECT
                    id,
                    company_id,
                    activity_record_type,
                    stage_name,
                    notes,
                    close_date
                FROM log_activity
                WHERE company_id = %s
            """, (company_id,))
            activities = cur.fetchall()
    for activity in activities:
        if activity["close_date"]:
            activity["close_date"] = activity["close_date"].isoformat()
        else:
            activity["close_date"] = None

    return jsonify({
        "activities": activities,
    })

# Delete user logged activity (Zhixiang Miao)
@app.route("/api/companies/<company_id>/log_activity", methods=["DELETE"])
def delete_logged_activity(company_id):
    activity_id = request.args.get("activity_id")
    if not activity_id:
        return jsonify({
            "status": "error",
            "message": "Activity ID is required",
        }), 400
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM log_activity
                WHERE id = %s AND company_id = %s
            """, (activity_id, company_id))
            if cur.rowcount == 0:
                return jsonify({
                    "status": "error",
                    "message": "Activity not found or already deleted",
                }), 404
    return jsonify({
        "status": "deleted",
        "activity_id": activity_id,
    })

# Get active research awards for a company (Zhixiang Miao)
@app.route("/api/companies/<company_id>/active_research_awards", methods=["GET"])
def active_research_awards(company_id):
    today = at.now(timezone('America/New_York')).date()
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    -- Learned how to convert to float in sql from this link: https://www.geeksforgeeks.org/sql-server/sql-server-cast-function/
                    CAST(sr.payload ->> 'anticipatedTotalAmount' AS FLOAT) AS total_amount
                FROM activities a
                JOIN source_records sr ON a.source_record_id = sr.id
                WHERE a.company_entity_id = %s
                    AND a.activity_type = 'award'
                    AND sr.source_system = 'kuali'
                    AND sr.payload ->> 'statusDescription' = 'Active'
                    AND a.occurred_on <= %s
                    AND (a.ended_on IS NULL OR a.ended_on >= %s)
            """, (company_id, today, today))
            awards = cur.fetchall()

    return jsonify({
        "active_research_awards": awards,
    })


# Loaded all research awards for a company (Zhixiang Miao)
@app.route("/api/companies/<company_id>/all_research_awards", methods=["GET"])
def all_research_awards(company_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    a.id,
                    sr.payload ->> 'awardId' AS award_id,
                    sr.payload ->> 'sponsorCode' AS sponsor_code,
                    sr.payload ->> 'title' AS title,
                    sr.payload ->> 'statusDescription' AS status,
                    sr.payload ->> 'awardEffectiveDate' as date,
                    CAST(sr.payload ->> 'anticipatedTotalAmount' AS FLOAT) AS total_amount,
                    pei.display_name AS pi,
                    pei.id AS pi_entity_id,
                    msu_unit.display_name AS lead_unit
                FROM activities a
                JOIN source_records sr ON a.source_record_id = sr.id
                LEFT JOIN entities pei ON a.person_entity_id = pei.id
                LEFT JOIN entities msu_unit ON a.msu_unit_entity_id = msu_unit.id
                WHERE a.company_entity_id = %s
                    AND a.activity_type = 'award'
                    AND sr.source_system = 'kuali'
                ORDER BY a.occurred_on DESC
            """, (company_id,))
            awards = cur.fetchall()
    Root = Path(__file__).parent
    SPONSORS_FILE = Root / "db" / "awards" / "sponsors.json"
    sponsors = read_json_file(SPONSORS_FILE)
    for sponsor in sponsors:
        for award in awards:
            if award['sponsor_code'] == sponsor['sponsorCode']:
                award['sponsor_name'] = sponsor['sponsorName']

    return jsonify({
        "research_awards": awards,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), use_reloader=True)