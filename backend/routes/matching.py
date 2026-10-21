from flask import Blueprint, Flask, request, jsonify, render_template, redirect, url_for, session, flash
from flask_cors import CORS
import uuid
import psycopg
from psycopg.rows import dict_row
from days_calculator.days_calculator import days_passed_calc
import json
from scripts.merge_entities import get_final_entity, merge_persons, reverse_merge, merge_companies
from functools import wraps
from flask import g, request
from database import get_db_connection

bp = Blueprint('matching', __name__)

DEMO_REVIEWER_PK = "STF-003"

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
@bp.route('/api/stewardship-queue')
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
@bp.route('/api/stewardship-queue/discarded')
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

# sends a human-reviewed match back to the pending queue (Aayush)
@bp.route('/api/matches/<match_id>/undo', methods=['POST'])
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
                    status,
                    entity_id,
                    merged_entity_id
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

            if not reverse_merge(
                cur,
                match_id,
                match["entity_id"],
                match["merged_entity_id"],
            ):
                return jsonify({"error": "Undo the later merge first"}), 409

            cur.execute(
                """
                UPDATE entity_matches
                SET
                    status = 'pending_review',
                    entity_id = NULL,
                    merged_entity_id = NULL,
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
@bp.route('/api/matches/<match_id>/decision', methods=['POST'])
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
                    entity_id,
                    merged_entity_id,
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
                if match["status"] == "auto_accepted":
                    if not reverse_merge(
                        cur,
                        match_id,
                        match["entity_id"],
                        match["merged_entity_id"],
                    ):
                        return jsonify({"error": "Undo the later merge first"}), 409

                cur.execute(
                    """
                    UPDATE entity_matches
                    SET
                        status = 'rejected',
                        reviewed_by_entity_id = %s,
                        reviewed_at = now(),
                        entity_id = NULL,
                        merged_entity_id = NULL
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

            # resolves the original pair before following existing merges
            cur.execute(
                """
                SELECT e.id
                FROM entity_source_records esr
                JOIN entities e
                    ON e.id = esr.entity_id
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

            final_entities = [
                get_final_entity(cur, entity["id"])
                for entity in entities
            ]

            left, right = final_entities

            if left["entity_type"] != right["entity_type"]:
                return jsonify({"error": "Match entities have different types"}), 409

            merged_entity_id = None

            if left["id"] == right["id"]:
                survivor = left
            else:
                # uses final records instead of the original pair
                survivor, duplicate = sorted(
                    final_entities,
                    key=lambda entity: (
                        entity["source_system"] != "salesforce",
                        entity["source_pk"],
                    ),
                )

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
                        match_id,
                    )
                else:
                    return jsonify({"error": "Unsupported entity type"}), 409

                merged_entity_id = duplicate["id"]

            cur.execute(
                """
                UPDATE entity_matches
                SET
                    status = 'confirmed',
                    entity_id = %s,
                    merged_entity_id = %s,
                    reviewed_by_entity_id = %s,
                    reviewed_at = now()
                WHERE id = %s
                """,
                (
                    survivor["id"],
                    merged_entity_id,
                    reviewer_id,
                    match_id,
                ),
            )

            return jsonify({
                "match_id": match_id,
                "status": "confirmed",
            })

# def merge_companies(cur, survivor_id, duplicate_id):
#     # Makes sure there are no connecting edges (there shouldn't be)
#     cur.execute(
#         """
#         DELETE FROM edges
#         WHERE (from_entity_id = %(s)s AND to_entity_id = %(d)s)
#            OR (from_entity_id = %(d)s AND to_entity_id = %(s)s)
#         """,
#         {"s": survivor_id, "d": duplicate_id},
#     )
#     # Moves all activities from the duplicate company to the survivor company
#     cur.execute("UPDATE activities SET company_entity_id = %s WHERE company_entity_id = %s",
#         (survivor_id, duplicate_id),
#     )
#     activities_moved = cur.rowcount
#
#     # Moves edges pointing to the duplicate to the survivor
#     cur.execute(
#         "UPDATE edges SET to_entity_id = %s WHERE to_entity_id = %s",
#         (survivor_id, duplicate_id),
#     )
#     edges_moved = cur.rowcount
#
#     # Moves edges pointing from the company to the duplicate to the survivor
#     cur.execute(
#         "UPDATE edges SET from_entity_id = %s WHERE from_entity_id = %s",
#         (survivor_id, duplicate_id),
#     )
#     edges_moved += cur.rowcount
#
#     cur.execute(
#         "UPDATE entities SET merged_into_id = %s WHERE id = %s",
#         (survivor_id, duplicate_id),
#     )
#
#     return activities_moved, edges_moved
