import os
import re
from collections import defaultdict
from itertools import combinations

import psycopg


DATABASE_URL = os.environ["DATABASE_URL"]

AUTO_ACCEPT_THRESHOLD = 0.90
REVIEW_THRESHOLD = 0.60

NAME_EXACT_WEIGHT = 0.30
NAME_INITIAL_WEIGHT = 0.20
CITY_WEIGHT = 0.20
DEGREE_WEIGHT = 0.25
EMPLOYER_WEIGHT = 0.25


def load_people(cur):
    cur.execute(
        """
        SELECT
            e.id,
            e.display_name,
            e.email,
            e.attributes,
            esr.source_record_id,
            sr.source_pk,
            sr.payload->>'FirstName',
            sr.payload->>'LastName',
            sr.source_system
        FROM entities e
        JOIN entity_source_records esr
            ON esr.entity_id = e.id
        JOIN source_records sr
            ON sr.id = esr.source_record_id
        WHERE e.entity_type = 'person'
          AND e.merged_into_id IS NULL
        ORDER BY sr.source_pk
        """
    )

    people = []

    for row in cur.fetchall():
        display_name = row[1]
        first = row[6]
        last = row[7]

        # only split display_name when the source doesn't provide first or last name
        if not first and not last:
            parts = display_name.split()

            if parts:
                first = parts[0]
                last = parts[-1]

        people.append({
            "entity_id": row[0],
            "display_name": display_name,
            "email": row[2],
            "attributes": row[3],
            "source_record_id": row[4],
            "source_pk": row[5],
            "first": first,
            "last": last,
            "source_system": row[8],
        })

    return people


# loads all degrees for each person since a person can have more than one degree
def load_degrees(cur):
    cur.execute(
        """
        SELECT
            person_entity_id,
            degree_type,
            major,
            class_year
        FROM degrees
        """
    )

    degrees = defaultdict(set)

    for person_id, degree_type, major, class_year in cur.fetchall():
        degrees[person_id].add(
            (degree_type, major, class_year)
        )

    return degrees


# loads all current employers for each person from active employment edges
def load_current_employers(cur):
    cur.execute(
        """
        SELECT
            from_entity_id,
            to_entity_id
        FROM edges
        WHERE edge_type = 'employed_by'
          AND valid_to IS NULL
        """
    )

    employers = defaultdict(set)

    for person_id, employer_id in cur.fetchall():
        employers[person_id].add(employer_id)

    return employers


# normalizes person names without stripping suffixes like inc or co like we did in company matcher
def normalize_person_name(name):
    if not name:
        return ""

    name = name.lower()
    name = re.sub(r"[^\w\s]", " ", name)

    return " ".join(name.split())


# groups people by last name so people with the same last name are compared
def block_by_last_name(people):
    blocks = defaultdict(list)

    for person in people:
        last = normalize_person_name(person["last"])

        if last:
            blocks[last].append(person)

    return {
        last: group
        for last, group in blocks.items()
        if len(group) > 1
    }


# identifies whether the first names are exact matches or an initial match
def first_name_match_type(first1, first2):
    first1 = normalize_person_name(first1)
    first2 = normalize_person_name(first2)

    if not first1 or not first2:
        return None

    if first1 == first2:
        return "exact"

    if len(first1) == 1 and first2.startswith(first1):
        return "initial"

    if len(first2) == 1 and first1.startswith(first2):
        return "initial"

    return None


def same_city(person1, person2):
    attributes1 = person1["attributes"] or {}
    attributes2 = person2["attributes"] or {}

    city1 = attributes1.get("city")
    city2 = attributes2.get("city")

    if not city1 or not city2:
        return False

    return (
        normalize_person_name(city1)
        == normalize_person_name(city2)
    )


def shared_degree(person1, person2, degrees):
    degrees1 = degrees.get(person1["entity_id"], set())
    degrees2 = degrees.get(person2["entity_id"], set())

    if not degrees1 or not degrees2:
        return False

    return bool(degrees1 & degrees2)


def shared_current_employer(person1, person2, employers):
    employers1 = employers.get(person1["entity_id"], set())
    employers2 = employers.get(person2["entity_id"], set())

    if not employers1 or not employers2:
        return False

    return bool(employers1 & employers2)


# scores the match and assigns the pair to a review band
def score_and_band(name_match, city_match, degree_match, employer_match):
    score = 0.0
    reasons = []

    if name_match == "exact":
        score += NAME_EXACT_WEIGHT
        reasons.append("name_exact")

    elif name_match == "initial":
        score += NAME_INITIAL_WEIGHT
        reasons.append("name_initial")

    if city_match:
        score += CITY_WEIGHT
        reasons.append("same_city")

    if degree_match:
        score += DEGREE_WEIGHT
        reasons.append("shared_degree")

    if employer_match:
        score += EMPLOYER_WEIGHT
        reasons.append("same_employer")

    score = round(score, 3)

    # initial matches always need human review even if score is high enough to auto-accept
    if name_match == "initial" and score >= REVIEW_THRESHOLD:
        return score, "pending_review", reasons

    if score >= AUTO_ACCEPT_THRESHOLD:
        return score, "auto_accepted", reasons

    if score >= REVIEW_THRESHOLD:
        return score, "pending_review", reasons

    return score, "auto_rejected", reasons


# order-independent key so (A,B) and (B,A) are treated the same
def pair_key(left_id, right_id):
    return frozenset((left_id, right_id))


def write_matches(cur, results):
    # only removes machine-generated person matches so company matches don't get touched
    cur.execute(
        """
        DELETE FROM entity_matches m
        USING entity_source_records esr, entities e
        WHERE m.left_source_record_id = esr.source_record_id
          AND esr.entity_id = e.id
          AND e.entity_type = 'person'
          AND m.status IN ('pending_review', 'auto_accepted', 'auto_rejected')
        """
    )

    cur.execute(
        """
        SELECT
            m.left_source_record_id,
            m.right_source_record_id
        FROM entity_matches m
        JOIN entity_source_records esr
            ON esr.source_record_id = m.left_source_record_id
        JOIN entities e
            ON e.id = esr.entity_id
        WHERE e.entity_type = 'person'
          AND m.status IN ('confirmed', 'rejected')
        """
    )

    reviewed_pairs = {
        pair_key(left_id, right_id)
        for left_id, right_id in cur.fetchall()
    }

    for result in results:
        left = result["left"]
        right = result["right"]

        current_pair = pair_key(
            left["source_record_id"],
            right["source_record_id"],
        )

        if current_pair in reviewed_pairs:
            continue

        entity_id = None

        if result["status"] == "auto_accepted":
            # merges to salesforce otherwise merges to lower id
            survivor = min(
                (left, right),
                key=lambda person: (
                    person["source_system"] != "salesforce",
                    person["source_pk"],
                ),
            )
            entity_id = survivor["entity_id"]

        cur.execute(
            """
            INSERT INTO entity_matches (
                left_source_record_id,
                right_source_record_id,
                score,
                match_reasons,
                status,
                entity_id
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                left["source_record_id"],
                right["source_record_id"],
                result["score"],
                result["reasons"],
                result["status"],
                entity_id,
            ),
        )

    cur.execute(
        """
        SELECT m.status, count(*)
        FROM entity_matches m
        JOIN entity_source_records esr
            ON esr.source_record_id = m.left_source_record_id
        JOIN entities e
            ON e.id = esr.entity_id
        WHERE e.entity_type = 'person'
        GROUP BY m.status
        ORDER BY m.status
        """
    )

    print("\nStored person matches:")

    for status, count in cur.fetchall():
        print(f"{status}: {count}")


def main():
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            people = load_people(cur)
            degrees = load_degrees(cur)
            employers = load_current_employers(cur)

            blocks = block_by_last_name(people)
            pair_count = 0
            results = []

            for group in blocks.values():
                for person1, person2 in combinations(group, 2):
                    name_match = first_name_match_type(
                        person1["first"],
                        person2["first"],
                    )

                    if name_match is None:
                        continue

                    pair_count += 1

                    city_match = same_city(person1, person2)
                    degree_match = shared_degree(
                        person1,
                        person2,
                        degrees,
                    )
                    employer_match = shared_current_employer(
                        person1,
                        person2,
                        employers,
                    )

                    score, status, reasons = score_and_band(
                        name_match,
                        city_match,
                        degree_match,
                        employer_match,
                    )

                    results.append({
                        "left": person1,
                        "right": person2,
                        "score": score,
                        "status": status,
                        "reasons": reasons,
                    })

                    print(
                        f"{person1['source_pk']}: {person1['display_name']} "
                        f"<-> "
                        f"{person2['source_pk']}: {person2['display_name']}\n"
                        f"  score={score:.3f} | "
                        f"status={status} | "
                        f"reasons={reasons}"
                    )

            print(f"\nLast-name blocks: {len(blocks)}")
            print(f"Compatible pairs: {pair_count}")

            write_matches(cur, results)


if __name__ == "__main__":
    main()