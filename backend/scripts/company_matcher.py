import os
import re

import psycopg


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

            for (
                entity_id,
                display_name,
                source_record_id,
                parent_external_id,
                source_pk,
            ) in companies:
                normalized = normalize_name(display_name)

                print(
                    f"{source_pk}: "
                    f"{display_name} -> {normalized}"
                )

            print(f"\nCompanies loaded: {len(companies)}")


if __name__ == "__main__":
    main()