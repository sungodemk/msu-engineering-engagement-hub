import uuid

from flask import Blueprint, g, jsonify, request

from auth import require_login
from database import get_db_connection
from scripts.merge_entities import get_final_entity


bp = Blueprint("profile", __name__, url_prefix="/api/me")


# resolves a staff source record to the final person (Aayush)
def get_staff_person_id(cur, staff_external_id):
    if not staff_external_id:
        return None

    cur.execute(
        """
        SELECT e.id
        FROM source_records sr
        JOIN entity_source_records esr
            ON esr.source_record_id = sr.id
        JOIN entities e
            ON e.id = esr.entity_id
        WHERE sr.source_system = 'salesforce'
          AND sr.source_pk = %s
          AND e.entity_type = 'person'
        LIMIT 1
        """,
        (staff_external_id,),
    )
    person = cur.fetchone()
    if person is None:
        return None

    return get_final_entity(cur, person["id"])["id"]


# returns account details and the linked person's name (Aayush)
@bp.route("/profile", methods=["GET"])
@require_login
def get_profile():
    person_id = None
    person_name = None

    if g.user["staff_external_id"]:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                person_id = get_staff_person_id(cur, g.user["staff_external_id"])
                if person_id is not None:
                    cur.execute(
                        """
                        SELECT display_name
                        FROM entities
                        WHERE id = %s
                        """,
                        (person_id,),
                    )
                    person_name = cur.fetchone()["display_name"]

    return jsonify({
        "email": g.user["email"],
        "display_name": g.user["display_name"],
        "role": g.user["role"],
        "person_id": str(person_id) if person_id is not None else None,
        "person_name": person_name,
    })


# resolves follows when reading so company merges never rewrite them (Aayush)
@bp.route("/follows", methods=["GET"])
@require_login
def list_follows():
    companies = []
    seen = set()

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT company_entity_id
                FROM company_follows
                WHERE user_id = %s
                ORDER BY followed_at
                """,
                (g.user["id"],),
            )
            follows = cur.fetchall()

            for follow in follows:
                final = get_final_entity(cur, follow["company_entity_id"])
                if final["id"] in seen:
                    continue

                cur.execute(
                    """
                    SELECT
                        id,
                        display_name AS name,
                        attributes->>'industry' AS industry
                    FROM entities
                    WHERE id = %s
                      AND entity_type = 'organization'
                    """,
                    (final["id"],),
                )
                company = cur.fetchone()

                companies.append(company)
                seen.add(final["id"])

    return jsonify(companies)


# follows the requested company without creating duplicates (Aayush)
@bp.route("/follows", methods=["POST"])
@require_login
def follow_company():
    data = request.get_json(silent=True)
    company_id = data.get("company_id") if isinstance(data, dict) else None

    try:
        company_id = uuid.UUID(company_id)
    except (TypeError, ValueError, AttributeError):
        return jsonify({"error": "Invalid company ID"}), 400

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT entity_type
                FROM entities
                WHERE id = %s
                """,
                (company_id,),
            )
            company = cur.fetchone()

            if company is None:
                return jsonify({"error": "Company not found"}), 404
            if company["entity_type"] != "organization":
                return jsonify({"error": "Entity is not an organization"}), 400

            # unique pair makes a repeated follow harmless
            cur.execute(
                """
                INSERT INTO company_follows (user_id, company_entity_id)
                VALUES (%s, %s)
                ON CONFLICT (user_id, company_entity_id) DO NOTHING
                """,
                (g.user["id"], company_id),
            )

    return jsonify({"company_id": str(company_id), "status": "followed"})


# removes follows pointing to the same final company (Aayush)
@bp.route("/follows/<company_id>", methods=["DELETE"])
@require_login
def unfollow_company(company_id):
    try:
        company_id = uuid.UUID(company_id)
    except ValueError:
        return jsonify({"error": "Invalid company ID"}), 400

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT entity_type
                FROM entities
                WHERE id = %s
                """,
                (company_id,),
            )
            company = cur.fetchone()
            if company is None or company["entity_type"] != "organization":
                return jsonify({"error": "Company not found"}), 404

            target = get_final_entity(cur, company_id)["id"]

            cur.execute(
                """
                SELECT id, company_entity_id
                FROM company_follows
                WHERE user_id = %s
                """,
                (g.user["id"],),
            )
            follows = cur.fetchall()

            removed = 0
            # remove original and duplicate follows that now share a survivor
            for follow in follows:
                final = get_final_entity(cur, follow["company_entity_id"])
                if final["id"] != target:
                    continue

                cur.execute(
                    """
                    DELETE FROM company_follows
                    WHERE id = %s
                    """,
                    (follow["id"],),
                )
                removed += cur.rowcount

            if not removed:
                return jsonify({"error": "Follow not found"}), 404

    return jsonify({"company_id": str(target), "status": "unfollowed"})