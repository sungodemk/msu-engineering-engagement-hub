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
        ("capstone", "capstone", "person_entity_id"),
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


# reverses logged moves before unmerging an entity (Aayush)
def reverse_merge(cur, match_id, survivor_id, merged_entity_id):
    if merged_entity_id is None:
        return True

    # later merges must be undone before this one
    cur.execute(
        """
        SELECT merged_into_id
        FROM entities
        WHERE id = %s
        """,
        (survivor_id,),
    )
    if cur.fetchone()["merged_into_id"] is not None:
        return False

    cur.execute(
        """
        SELECT row_type, row_id, changed_column, old_entity_id, new_entity_id
        FROM entity_merge_moves
        WHERE match_id = %s
        ORDER BY move_order DESC
        """,
        (match_id,),
    )
    moves = cur.fetchall()

    # only these fixed table and column pairs may be updated
    targets = {
        ("activity", "company_entity_id"): ("activities", "company_entity_id"),
        ("activity", "person_entity_id"): ("activities", "person_entity_id"),
        ("activity", "owner_entity_id"): ("activities", "owner_entity_id"),
        ("edge", "from_entity_id"): ("edges", "from_entity_id"),
        ("edge", "to_entity_id"): ("edges", "to_entity_id"),
        ("degree", "person_entity_id"): ("degrees", "person_entity_id"),
        ("capstone", "person_entity_id"): ("capstone", "person_entity_id"),
        ("capstone", "company_entity_id"): ("capstone", "company_entity_id"),
    }

    for move in moves:
        target = targets.get((move["row_type"], move["changed_column"]))
        if target is None:
            raise ValueError("Unexpected merge move target")

        table, column = target
        cur.execute(
            f"""
            UPDATE {table}
            SET {column} = %s
            WHERE id = %s AND {column} = %s
            """,
            (
                move["old_entity_id"],
                move["row_id"],
                move["new_entity_id"],
            ),
        )

    cur.execute(
        """
        UPDATE entities
        SET merged_into_id = NULL
        WHERE id = %s
        """,
        (merged_entity_id,),
    )
    cur.execute(
        """
        DELETE FROM entity_merge_moves
        WHERE match_id = %s
        """,
        (match_id,),
    )
    return True