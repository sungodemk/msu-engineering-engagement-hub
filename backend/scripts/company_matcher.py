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

AUTO_ACCEPT_THRESHOLD = 0.90
REVIEW_THRESHOLD = 0.60


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


# skips parent or subsidiary company pairs since even though they are related they aren't duplicates
def is_parent_child(company1, company2):
    return (
        company1["parent_external_id"] == company2["source_pk"]
        or company2["parent_external_id"] == company1["source_pk"]
    )


def load_companies(cur):
    cur.execute(
        """
        SELECT
            e.id,
            e.display_name,
            esr.source_record_id,
            e.attributes->>'parent_external_id',
            sr.source_pk,
            sr.source_system
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

    return [
        {
            "entity_id": row[0],
            "name": row[1],
            "source_record_id": row[2],
            "parent_external_id": row[3],
            "source_pk": row[4],
            "source_system": row[5],
        }
        for row in cur.fetchall()
    ]


def score_pairs(companies):
    results = []

    for company1, company2 in combinations(companies, 2):
        if is_parent_child(company1, company2):
            continue

        name1 = normalize_name(company1["name"])
        name2 = normalize_name(company2["name"])

        results.append({
            "left": company1,
            "right": company2,

            # catches minor spelling difference
            "jaro": JaroWinkler.similarity(name1, name2),

            # catches partial names
            "token": fuzz.token_set_ratio(name1, name2) / 100,

            # catches when a single word name equals the initials of the other name
            "acronym": acronym_score(name1, name2),
        })

    return results


def combined_score(result, rule):
    if rule == "highest":
        return max(result["jaro"], result["token"])

    if rule == "average":
        return (result["jaro"] + result["token"]) / 2

    if rule == "lower":
        # asks for both scores to ensure that one score isn't dominating and allows for balance
        return min(result["jaro"], result["token"])

    raise ValueError(f"Unknown scoring rule: {rule}")


def band_result(result, score):
    reasons = []

    if score >= REVIEW_THRESHOLD:
        reasons.append("name_similarity")

    if result["acronym"] == 1.0:
        reasons.append("acronym")
        return "pending_review", reasons

    if score >= AUTO_ACCEPT_THRESHOLD:
        return "auto_accepted", reasons

    if score >= REVIEW_THRESHOLD:
        return "pending_review", reasons

    return "auto_rejected", reasons


# order-independent key so (A,B) and (B,A) are treated the same
def pair_key(left_id, right_id):
    # this ignores order and can be stored inside another set
    return frozenset((left_id, right_id))


def write_matches(cur, results):
    # only removes machine-generated organization matches so person matches stay untouched
    cur.execute(
        """
        DELETE FROM entity_matches m
        USING entity_source_records esr, entities e
        WHERE m.left_source_record_id = esr.source_record_id
          AND esr.entity_id = e.id
          AND e.entity_type = 'organization'
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
        WHERE e.entity_type = 'organization'
          AND m.status IN ('confirmed', 'rejected')
        """
    )

    reviewed_pairs = {
        pair_key(left_id, right_id)
        for left_id, right_id in cur.fetchall()
    }

    for result in results:
        score = combined_score(result, "lower")
        status, reasons = band_result(result, score)

        left = result["left"]
        right = result["right"]

        current_pair = pair_key(
            left["source_record_id"],
            right["source_record_id"],
        )

        if current_pair in reviewed_pairs:
            continue

        entity_id = None

        if status == "auto_accepted":
            # merges to salesforce otherwise merges to lower id
            survivor = min(
                (left, right),
                key=lambda company: (
                    company["source_system"] != "salesforce",
                    company["source_pk"],
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
                round(score, 3),
                reasons,
                status,
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
        WHERE e.entity_type = 'organization'
        GROUP BY m.status
        ORDER BY m.status
        """
    )

    print("\nStored company matches:")

    for status, count in cur.fetchall():
        print(f"{status}: {count}")


def main():
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            companies = load_companies(cur)

            results = score_pairs(companies)

            for rule in ["highest", "average", "lower"]:
                ranked = [
                    (combined_score(result, rule), result)
                    for result in results
                ]

                ranked.sort(
                    key=lambda item: item[0],
                    reverse=True,
                )

                auto_count = sum(
                    score >= AUTO_ACCEPT_THRESHOLD
                    for score, _ in ranked
                )

                review_count = sum(
                    REVIEW_THRESHOLD <= score < AUTO_ACCEPT_THRESHOLD
                    for score, _ in ranked
                )

                print(
                    f"\n{rule}: "
                    f"auto={auto_count}, review={review_count}"
                )

                for score, result in ranked[:5]:
                    print(
                        f"{result['left']['name']} <-> "
                        f"{result['right']['name']} | "
                        f"{score:.3f}"
                    )

            print("\nChosen rule: lower")

            discarded_count = 0

            for result in results:
                score = combined_score(result, "lower")
                status, reasons = band_result(result, score)

                if status == "auto_rejected":
                    discarded_count += 1
                    continue

                print(
                    f"{result['left']['name']} <-> "
                    f"{result['right']['name']} | "
                    f"{status} | "
                    f"score={score:.3f} | "
                    f"jaro={result['jaro']:.3f} | "
                    f"token={result['token']:.3f} | "
                    f"acronym={result['acronym']:.1f} | "
                    f"reasons={reasons}"
                )

            print(f"Auto-rejected: {discarded_count}")

            write_matches(cur, results)


if __name__ == "__main__":
    main()