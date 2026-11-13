import re
import uuid
from datetime import date, timedelta

from flask import Blueprint, g, jsonify, request

from auth import require_login
from database import get_db_connection
from scripts.entity_edits import (
    ALLOWED_FIELDS,
    write_entity_field,
    write_edge_role,
    write_edge_dates,
)
from scripts.merge_entities import get_final_entity
from scripts.rescoring import rescore_person, rescore_company


bp = Blueprint("edits", __name__)


# resolves merged IDs and keeps the final entity's source (Aayush)
def get_editable_entity(cur, entity_id):
    cur.execute(
        """
        SELECT id
        FROM entities
        WHERE id = %s
        """,
        (entity_id,),
    )

    if cur.fetchone() is None:
        return None

    final = get_final_entity(cur, entity_id)

    cur.execute(
        """
        SELECT id, entity_type, display_name, email, attributes
        FROM entities
        WHERE id = %s
        """,
        (final["id"],),
    )

    entity = cur.fetchone()
    entity["source_system"] = final["source_system"]
    entity["source_pk"] = final["source_pk"]

    return entity


# returns the fields allowed for the entity's type (Aayush)
def get_editable_values(entity):
    values = {
        "id": str(entity["id"]),
        "entity_type": entity["entity_type"],
        "display_name": entity["display_name"],
    }

    if entity["entity_type"] == "person":
        values["email"] = entity["email"]

    for field in ("industry", "industry_detail", "city", "state"):
        if field in ALLOWED_FIELDS[entity["entity_type"]]:
            values[field] = entity["attributes"].get(field)

    return values

# provides the current editable fields to the form (Aayush)
@bp.route("/api/entities/<entity_id>/edit", methods=["GET"])
@require_login
def get_entity_edit(entity_id):
    try:
        entity_id = uuid.UUID(entity_id)
    except ValueError:
        return jsonify({"error": "Invalid entity ID"}), 400

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            entity = get_editable_entity(cur, entity_id)

            if entity is None:
                return jsonify({"error": "Entity not found"}), 404

            if entity["entity_type"] not in ALLOWED_FIELDS:
                return jsonify({"error": "Entity type cannot be edited"}), 400

            return jsonify(get_editable_values(entity))


# saves only changed fields and records who edited them (Aayush)
@bp.route("/api/entities/<entity_id>", methods=["PATCH"])
@require_login
def patch_entity(entity_id):
    try:
        entity_id = uuid.UUID(entity_id)
    except ValueError:
        return jsonify({"error": "Invalid entity ID"}), 400

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Expected a JSON object"}), 400

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            entity = get_editable_entity(cur, entity_id)

            if entity is None:
                return jsonify({"error": "Entity not found"}), 404

            allowed = ALLOWED_FIELDS.get(entity["entity_type"])

            if allowed is None:
                return jsonify({"error": "Entity type cannot be edited"}), 400

            current = get_editable_values(entity)
            changes = []

            # validate all fields before writing anything
            for field, value in data.items():
                if field not in allowed:
                    return jsonify({"error": f"Field not allowed: {field}"}), 400

                if value is not None and not isinstance(value, str):
                    return jsonify({"error": f"Invalid value for {field}"}), 400

                value = value.strip() if value is not None else None

                if value == "":
                    value = None

                if field == "display_name" and value is None:
                    return jsonify({"error": "display_name cannot be empty"}), 400

                old_value = current[field]

                if old_value != value:
                    changes.append((field, old_value, value))

            if not changes:
                return jsonify(current)

            for field, old_value, new_value in changes:
                write_entity_field(
                    cur,
                    entity["id"],
                    field,
                    new_value,
                )

                cur.execute(
                    """
                    INSERT INTO entity_edits (
                        source_system,
                        source_pk,
                        field_name,
                        old_value,
                        new_value,
                        edited_by
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        entity["source_system"],
                        entity["source_pk"],
                        field,
                        old_value,
                        new_value,
                        g.user["id"],
                    ),
                )

            # rescore changed entities in the same transaction (Aayush)
            if entity["entity_type"] == "person":
                rescored = rescore_person(conn, entity["id"])
            else:
                rescored = rescore_company(conn, entity["id"])

            cur.execute(
                """
                SELECT id, entity_type, display_name, email, attributes
                FROM entities
                WHERE id = %s
                """,
                (entity["id"],),
            )

            result = get_editable_values(cur.fetchone())
            result["rescored"] = rescored
            return jsonify(result)

# validates dates without accepting alternate date formats (Aayush)
def parse_affiliation_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return None

    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


# lists a person's jobs with inclusive end dates for editing (Aayush)
@bp.route("/api/persons/<person_id>/affiliations/edit", methods=["GET"])
@require_login
def get_affiliation_edits(person_id):
    try:
        person_id = uuid.UUID(person_id)
    except ValueError:
        return jsonify({"error": "Invalid person ID"}), 400

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT entity_type
                FROM entities
                WHERE id = %s
                """,
                (person_id,),
            )

            person = cur.fetchone()
            if person is None or person["entity_type"] != "person":
                return jsonify({"error": "Person not found"}), 404

            final = get_final_entity(cur, person_id)

            cur.execute(
                """
                SELECT
                    e.id,
                    company.display_name AS company,
                    e.edge_role AS title,
                    e.valid_from AS start_date,
                    e.valid_to - 1 AS end_date
                FROM edges e
                JOIN entities company
                    ON company.id = e.to_entity_id
                WHERE e.from_entity_id = %s
                  AND e.edge_type = 'employed_by'
                ORDER BY e.valid_from DESC, e.id
                """,
                (final["id"],),
            )

            jobs = []
            for edge in cur.fetchall():
                jobs.append({
                    "id": str(edge["id"]),
                    "company": edge["company"],
                    "title": edge["title"],
                    "start_date": edge["start_date"].isoformat(),
                    "end_date": (
                        edge["end_date"].isoformat()
                        if edge["end_date"] is not None else None
                    ),
                })

            return jsonify(jobs)


# saves changed job fields and rescores only when dates change (Aayush)
@bp.route("/api/edges/<edge_id>", methods=["PATCH"])
@require_login
def patch_affiliation(edge_id):
    try:
        edge_id = uuid.UUID(edge_id)
    except ValueError:
        return jsonify({"error": "Invalid edge ID"}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Expected a JSON object"}), 400

    for field in data:
        if field not in ("title", "start_date", "end_date"):
            return jsonify({"error": f"Field not allowed: {field}"}), 400

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    e.from_entity_id,
                    e.edge_role,
                    e.valid_from,
                    e.valid_to,
                    sr.source_system,
                    sr.source_pk
                FROM edges e
                JOIN source_records sr
                    ON sr.id = e.source_record_id
                WHERE e.id = %s
                  AND e.edge_type = 'employed_by'
                """,
                (edge_id,),
            )

            edge = cur.fetchone()
            if edge is None:
                return jsonify({"error": "Affiliation not found"}), 404

            title = edge["edge_role"]
            start_date = edge["valid_from"]
            valid_to = edge["valid_to"]

            if "title" in data:
                value = data["title"]
                if value is not None and not isinstance(value, str):
                    return jsonify({"error": "Invalid title"}), 400

                title = value.strip() if value is not None else None
                if title == "":
                    title = None

            if "start_date" in data:
                start_date = parse_affiliation_date(data["start_date"])
                if start_date is None:
                    return jsonify({"error": "Invalid start_date"}), 400

            if "end_date" in data:
                value = data["end_date"]

                if value is None or value == "":
                    valid_to = None
                else:
                    end_date = parse_affiliation_date(value)
                    if end_date is None:
                        return jsonify({"error": "Invalid end_date"}), 400

                    valid_to = end_date + timedelta(days=1)

            if valid_to is not None and valid_to <= start_date:
                return jsonify({"error": "End date is before start date"}), 400

            date_changed = (
                start_date != edge["valid_from"]
                or valid_to != edge["valid_to"]
            )
            changes = []

            if title != edge["edge_role"]:
                changes.append(("edge_role", edge["edge_role"], title))

            if start_date != edge["valid_from"]:
                changes.append(("valid_from", edge["valid_from"], start_date))

            if valid_to != edge["valid_to"]:
                changes.append(("valid_to", edge["valid_to"], valid_to))

            # updates the final date range together to satisfy its check constraint
            if date_changed:
                write_edge_dates(cur, edge_id, start_date, valid_to)

            if title != edge["edge_role"]:
                write_edge_role(cur, edge_id, title)

            for field, old_value, new_value in changes:
                cur.execute(
                    """
                    INSERT INTO edge_edits (
                        source_system,
                        source_pk,
                        field_name,
                        old_value,
                        new_value,
                        edited_by
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        edge["source_system"],
                        edge["source_pk"],
                        field,
                        str(old_value) if old_value is not None else None,
                        str(new_value) if new_value is not None else None,
                        g.user["id"],
                    ),
                )

            rescored = {"updated": 0, "inserted": 0}

            if date_changed:
                final = get_final_entity(cur, edge["from_entity_id"])
                rescored = rescore_person(conn, final["id"])

            end_date = valid_to - timedelta(days=1) if valid_to is not None else None

            return jsonify({
                "id": str(edge_id),
                "title": title,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat() if end_date is not None else None,
                "rescored": rescored,
            })
