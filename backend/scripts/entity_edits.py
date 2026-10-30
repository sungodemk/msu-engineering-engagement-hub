import os

import psycopg
from psycopg.rows import dict_row


ALLOWED_FIELDS = {
    "person": {"display_name", "email", "city", "state"},
    "organization": {
        "display_name",
        "industry",
        "industry_detail",
        "city",
        "state",
    },
}


# writes one field without changing unrelated entity data (Aayush)
def write_entity_field(cur, entity_id, field, value):
    if field == "display_name":
        cur.execute(
            """
            UPDATE entities
            SET display_name = %s
            WHERE id = %s
            """,
            (value, entity_id),
        )

    elif field == "email":
        cur.execute(
            """
            UPDATE entities
            SET email = %s
            WHERE id = %s
            """,
            (value, entity_id),
        )

    elif value is None:
        cur.execute(
            """
            UPDATE entities
            SET attributes = attributes - %s
            WHERE id = %s
            """,
            (field, entity_id),
        )

    else:
        cur.execute(
            """
            UPDATE entities
            SET attributes = jsonb_set(
                attributes,
                ARRAY[%s]::text[],
                to_jsonb(%s::text),
                true
            )
            WHERE id = %s
            """,
            (field, value, entity_id),
        )


# restores the latest field edits after a reseed (Aayush)
def main():
    applied = 0

    with psycopg.connect(
        os.environ["DATABASE_URL"],
        row_factory=dict_row,
    ) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT ON (source_system, source_pk, field_name)
                    source_system,
                    source_pk,
                    field_name,
                    new_value
                FROM entity_edits
                ORDER BY
                    source_system,
                    source_pk,
                    field_name,
                    edited_at DESC
                """
            )
            edits = cur.fetchall()

            for edit in edits:
                cur.execute(
                    """
                    SELECT e.id
                    FROM source_records sr
                    JOIN entity_source_records esr
                        ON esr.source_record_id = sr.id
                    JOIN entities e
                        ON e.id = esr.entity_id
                    WHERE sr.source_system = %s
                      AND sr.source_pk = %s
                      AND esr.linked_type = 'origin'
                    LIMIT 1
                    """,
                    (edit["source_system"], edit["source_pk"]),
                )
                entity = cur.fetchone()

                if entity is None:
                    continue

                write_entity_field(
                    cur,
                    entity["id"],
                    edit["field_name"],
                    edit["new_value"],
                )
                applied += 1

    print(f"Applied {applied} entity field edits")


if __name__ == "__main__":
    main()