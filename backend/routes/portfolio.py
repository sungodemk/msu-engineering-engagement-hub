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

bp = Blueprint('portfolio', __name__)

# Queries everything needed for the Portfolio page in one response (Alvin)
@bp.route('/api/portfolio')
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