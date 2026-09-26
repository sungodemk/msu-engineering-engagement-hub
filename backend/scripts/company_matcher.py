import os
import re
from itertools import combinations

import psycopg
from rapidfuzz import fuzz
from rapidfuzz.distance import JaroWinkler


DATABASE_URL = os.environ["DATABASE_URL"]

LEGAL_SUFFIXES = {
    "inc",
    "llc",
    "corp",
    "corporation",
    "co",
    "company",
    "ltd",
}


def normalize_name(name):
    name = name.lower()

    # replace punctuation, including &, with spaces
    name = re.sub(r"[^\w\s]", " ", name)

    words = name.split()

    # only remove legal suffixes when they appear at the end of a name
    while words and words[-1] in LEGAL_SUFFIXES:
        words.pop()

    return " ".join(words)


def acronym_score(name1, name2):
    words1 = name1.split()
    words2 = name2.split()

    if len(words1) == 1 and len(words2) > 1:
        acronym = "".join(word[0] for word in words2)
        return 1.0 if words1[0] == acronym else 0.0

    if len(words2) == 1 and len(words1) > 1:
        acronym = "".join(word[0] for word in words1)
        return 1.0 if words2[0] == acronym else 0.0

    return 0.0


def is_parent_child(company1, company2):
    parent1 = company1[3]
    parent2 = company2[3]

    source_pk1 = company1[4]
    source_pk2 = company2[4]

    return parent1 == source_pk2 or parent2 == source_pk1


def main():
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    e.id,
                    e.display_name,
                    esr.source_record_id,
                    e.attributes->>'parent_external_id',
                    sr.source_pk
                FROM entities e
                JOIN entity_source_records esr
                    ON esr.entity_id = e.id
                JOIN source_records sr
                    ON sr.id = esr.source_record_id
                WHERE e.entity_type = 'organization'
                  AND e.merged_into_id IS NULL
                ORDER BY sr.source_pk
                """
            )

            companies = cur.fetchall()

    results = []

    for company1, company2 in combinations(companies, 2):
        if is_parent_child(company1, company2):
            continue

        name1 = normalize_name(company1[1])
        name2 = normalize_name(company2[1])

        # catches minor spelling difference
        jaro = JaroWinkler.similarity(name1, name2)
        # catches partial names
        token = fuzz.token_set_ratio(name1, name2) / 100
        # catches when a single word name equals the initials of the other name
        acronym = acronym_score(name1, name2)

        highest = max(jaro, token, acronym)

        results.append(
            (
                highest,
                company1[1],
                company2[1],
                jaro,
                token,
                acronym,
            )
        )

    results.sort(key=lambda result: result[0], reverse=True)

    for (
        highest,
        name1,
        name2,
        jaro,
        token,
        acronym,
    ) in results[:15]:
        print(
            f"{name1} <-> {name2}\n"
            f"  Jaro-Winkler: {jaro:.3f} | "
            f"Token-set: {token:.3f} | "
            f"Acronym: {acronym:.1f}\n"
        )

    print(f"Companies: {len(companies)}")
    print(f"Pairs scored: {len(results)}")


if __name__ == "__main__":
    main()