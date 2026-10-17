# moves one entity column and logs each changed row (Aayush)
def move_column(cur, survivor_id, duplicate_id, table, row_type, column, match_id):
    edge_filter = ""

    # leaves edges connecting the two records unchanged
    if table == "edges":
        other_column = "to_entity_id" if column == "from_entity_id" else "from_entity_id"
        edge_filter = f"AND {other_column} <> %(survivor)s"

    params = {
        "survivor": survivor_id,
        "duplicate": duplicate_id,
        "match_id": match_id,
        "row_type": row_type,
        "column": column,
    }

    update_sql = f"""
        UPDATE {table}
        SET {column} = %(survivor)s
        WHERE {column} = %(duplicate)s
          {edge_filter}
    """

    cur.execute(
        f"""
        WITH moved AS (
            {update_sql}
            RETURNING id
        )
        INSERT INTO entity_merge_moves (
            match_id,
            row_type,
            row_id,
            changed_column,
            old_entity_id,
            new_entity_id
        )
        SELECT
            %(match_id)s::uuid,
            %(row_type)s,
            id,
            %(column)s,
            %(duplicate)s,
            %(survivor)s
        FROM moved
        """,
        params,
    )

    return cur.rowcount


# moves person data onto the survivor (Aayush)
def merge_persons(cur, survivor_id, duplicate_id, match_id):
    moves = 0

    for table, row_type, column in [
        ("activities", "activity", "person_entity_id"),
        ("activities", "activity", "owner_entity_id"),
        ("edges", "edge", "from_entity_id"),
        ("edges", "edge", "to_entity_id"),
        ("degrees", "degree", "person_entity_id"),
    ]:
        moves += move_column(
            cur,
            survivor_id,
            duplicate_id,
            table,
            row_type,
            column,
            match_id,
        )

    cur.execute(
        "UPDATE entities SET merged_into_id = %s WHERE id = %s",
        (survivor_id, duplicate_id),
    )

    return moves