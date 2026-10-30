import uuid

from flask import Blueprint, g, jsonify, request

from auth import require_login
from database import get_db_connection
from scripts.entity_edits import ALLOWED_FIELDS, write_entity_field
from scripts.merge_entities import get_final_entity


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

            cur.execute(
                """
                SELECT id, entity_type, display_name, email, attributes
                FROM entities
                WHERE id = %s
                """,
                (entity["id"],),
            )

            return jsonify(get_editable_values(cur.fetchone()))