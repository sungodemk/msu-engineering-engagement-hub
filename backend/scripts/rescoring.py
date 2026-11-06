from psycopg.rows import tuple_row

from scripts.person_matcher import (
    load_people,
    load_degrees,
    load_current_employers,
    block_by_last_name,
    normalize_person_name,
    first_name_match_type,
    same_city,
    shared_degree,
    shared_current_employer,
    same_email,
    same_class_year,
    score_and_band,
)
from scripts.company_matcher import (
    load_companies,
    score_pairs,
    combined_score,
    band_result,
)


# updates a match without changing reviewed decisions or merging entities (Aayush)
def save_rescored_pair(cur, left_id, right_id, score, reasons, status):
    if status == "auto_accepted":
        status = "pending_review"

    cur.execute(
        """
        SELECT id, score, match_reasons, status
        FROM entity_matches
        WHERE LEAST(left_source_record_id, right_source_record_id)
              = LEAST(%s::uuid, %s::uuid)
          AND GREATEST(left_source_record_id, right_source_record_id)
              = GREATEST(%s::uuid, %s::uuid)
        """,
        (left_id, right_id, left_id, right_id),
    )

    existing = cur.fetchone()

    if existing:
        match_id, old_score, old_reasons, old_status = existing

        if old_status in ("confirmed", "rejected", "auto_accepted"):
            return None

        if (float(old_score), old_reasons, old_status) == (score, reasons, status):
            return None

        cur.execute(
            """
            UPDATE entity_matches
            SET score = %s, match_reasons = %s, status = %s
            WHERE id = %s
            """,
            (score, reasons, status, match_id),
        )
        return "updated"

    cur.execute(
        """
        INSERT INTO entity_matches (
            left_source_record_id,
            right_source_record_id,
            score,
            match_reasons,
            status
        )
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        """,
        (left_id, right_id, score, reasons, status),
    )

    if cur.rowcount:
        return "inserted"

    return None


# recalculates one person's match pairs after an edit (Aayush)
def rescore_person(conn, entity_id):
    updated = 0
    inserted = 0

    with conn.cursor(row_factory=tuple_row) as cur:
        people = load_people(cur)
        edited = next(
            (person for person in people if str(person["entity_id"]) == str(entity_id)),
            None,
        )

        if edited is None:
            return {"updated": 0, "inserted": 0}

        degrees = load_degrees(cur)
        employers = load_current_employers(cur)
        blocks = block_by_last_name(people)

        last = normalize_person_name(edited["last"])

        for other in blocks.get(last, []):
            if edited["entity_id"] == other["entity_id"]:
                continue

            name_match = first_name_match_type(
                edited["first"],
                other["first"],
            )

            if name_match is None:
                continue

            city_match = same_city(edited, other)
            degree_match = shared_degree(edited, other, degrees)
            employer_match = shared_current_employer(edited, other, employers)
            email_match = same_email(edited, other)

            class_year_match = (
                not degree_match
                and same_class_year(edited, other, degrees)
            )

            score, status, reasons = score_and_band(
                name_match,
                city_match,
                degree_match,
                employer_match,
                email_match,
                class_year_match,
            )

            result = save_rescored_pair(
                cur,
                edited["source_record_id"],
                other["source_record_id"],
                score,
                reasons,
                status,
            )

            if result == "updated":
                updated += 1
            elif result == "inserted":
                inserted += 1

    return {"updated": updated, "inserted": inserted}


# recalculates one company's pairs with the existing company matcher (Aayush)
def rescore_company(conn, entity_id):
    updated = 0
    inserted = 0

    with conn.cursor(row_factory=tuple_row) as cur:
        companies = load_companies(cur)
        edited = next(
            (company for company in companies if str(company["entity_id"]) == str(entity_id)),
            None,
        )

        if edited is None:
            return {"updated": 0, "inserted": 0}

        for other in companies:
            if edited["entity_id"] == other["entity_id"]:
                continue

            results = score_pairs([edited, other])

            if not results:
                continue

            match = results[0]
            score = combined_score(match, "lower")
            status, reasons = band_result(match, score)

            result = save_rescored_pair(
                cur,
                edited["source_record_id"],
                other["source_record_id"],
                round(score, 3),
                reasons,
                status,
            )

            if result == "updated":
                updated += 1
            elif result == "inserted":
                inserted += 1

    return {"updated": updated, "inserted": inserted}