from pathlib import Path
from flask import Blueprint, Flask, request, jsonify, render_template, redirect, url_for, session, flash
from flask_cors import CORS
import uuid
import psycopg
from psycopg.rows import dict_row
from days_calculator.days_calculator import days_passed_calc
from scripts.load_kuali import read_json_file
from datetime import datetime as at
from pytz import timezone
from flask import g, request
from database import get_db_connection

bp = Blueprint('company', __name__)

# List all companies (Alvin)
@bp.route('/api/companies')
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
@bp.route('/api/companies/<company_id>')
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
@bp.route('/api/days_passed')
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
@bp.route('/api/companies/<company_id>/temporal')
def temporal(company_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
            SELECT id, activity_type, sub_type, occurred_on, ended_on, amount, status, notes
            FROM activities WHERE company_entity_id = %s ORDER BY occurred_on """, (company_id,))
            rows = cur.fetchall()
    return jsonify(rows)


# Save and display logged activities for a specific company page (Zhixiang Miao)
@bp.route("/api/companies/<company_id>/log_activity", methods=["GET", "POST"])
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
@bp.route("/api/companies/<company_id>/log_activity", methods=["DELETE"])
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
@bp.route("/api/companies/<company_id>/active_research_awards", methods=["GET"])
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
@bp.route("/api/companies/<company_id>/all_research_awards", methods=["GET"])
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
    Root = Path(__file__).resolve().parent.parent
    SPONSORS_FILE = Root / "db" / "awards" / "sponsors.json"
    sponsors = read_json_file(SPONSORS_FILE)
    for sponsor in sponsors:
        for award in awards:
            if award['sponsor_code'] == sponsor['sponsorCode']:
                award['sponsor_name'] = sponsor['sponsorName']

    return jsonify({
        "research_awards": awards,
    })

@bp.route("/api/companies/<company_id>/capstone_sponsorships", methods=["GET"])
def get_capstone(company_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    c.id,
                    c.title,
                    c.semester,
                    c.amount,
                    c.status,
                    c.notes
                FROM capstone c
                WHERE c.company_entity_id = %s
                ORDER BY c.semester DESC
            """, (company_id,))
            capstone_sponsorships = cur.fetchall()
    return jsonify(capstone_sponsorships)
