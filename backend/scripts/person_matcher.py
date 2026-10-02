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


# cities only count as matching evidence when both people have a city
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


# checks whether the two people share at least one degree
def shared_degree(person1, person2, degrees):
    degrees1 = degrees.get(person1["entity_id"], set())
    degrees2 = degrees.get(person2["entity_id"], set())

    if not degrees1 or not degrees2:
        return False

    return bool(degrees1 & degrees2)


# checks whether the two people share at least one current employer
def shared_current_employer(person1, person2, employers):
    employers1 = employers.get(person1["entity_id"], set())
    employers2 = employers.get(person2["entity_id"], set())

    if not employers1 or not employers2:
        return False

    return bool(employers1 & employers2)


def main():
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            people = load_people(cur)
            degrees = load_degrees(cur)
            employers = load_current_employers(cur)

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

            print(
                f"{person1['source_pk']}: {person1['display_name']} "
                f"<-> "
                f"{person2['source_pk']}: {person2['display_name']}\n"
                f"  same_city={city_match} | "
                f"shared_degree={degree_match} | "
                f"shared_employer={employer_match}"
            )

    print(f"\nLast-name blocks: {len(blocks)}")
    print(f"Compatible pairs: {pair_count}")


if __name__ == "__main__":
    main()