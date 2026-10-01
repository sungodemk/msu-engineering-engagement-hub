import os
import re
from collections import defaultdict
from itertools import combinations

import psycopg


DATABASE_URL = os.environ["DATABASE_URL"]


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
            sr.payload->>'LastName'
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
        })

    return people


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


# first names are compatible when they match or if one is an initial of the other
def first_names_compatible(first1, first2):
    first1 = normalize_person_name(first1)
    first2 = normalize_person_name(first2)

    if not first1 or not first2:
        return False

    if first1 == first2:
        return True

    if len(first1) == 1:
        return first2.startswith(first1)

    if len(first2) == 1:
        return first1.startswith(first2)

    return False

def main():
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            people = load_people(cur)

    blocks = block_by_last_name(people)
    pair_count = 0

    for group in blocks.values():
        for person1, person2 in combinations(group, 2):
            if not first_names_compatible(
                person1["first"],
                person2["first"],
            ):
                continue

            pair_count += 1

            print(
                f"{person1['source_pk']}: {person1['display_name']} "
                f"<-> "
                f"{person2['source_pk']}: {person2['display_name']}"
            )

    print(f"\nLast-name blocks: {len(blocks)}")
    print(f"Compatible pairs: {pair_count}")


if __name__ == "__main__":
    main()