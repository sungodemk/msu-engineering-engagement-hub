# Loads Kuali Researcher data into the database. This script is intended to be run as a one-time operation to populate the database with existing Kuali Researcher data.
# Emmanuel Koshy

import json
import os
from pathlib import Path 

import psycopg
from psycopg.types.json import Jsonb

Root = Path(__file__).resolve().parents[1]
DATABASE_URL = os.environ["DATABASE_URL"]

AWARDS_FILE = Root /"db" / "awards" / "awards.json"
SPONSORS_FILE = Root / "db" / "awards" / "sponsors.json"

KUALI_UNITS = {
    "10-4410": "dept_me",
    "10-4420": "dept_ece",
    "10-4430": "dept_cse",
    "10-4440": "dept_chems",
    "10-4460": "dept_bme",
    "20-3170": "school_of_packaging",

}

def read_json_file(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def normalize_name(name):
    return name.strip().lower()

def insert_kuali_source_record(cur, source_table, source_pk, payload):
    cur.execute(
        f"""
        INSERT INTO source_records (source_system, source_table, source_pk, payload)
        VALUES (%s, %s, %s, %s)
        RETURNING id
        """,
        ("kuali", source_table, source_pk, Jsonb(payload)),
    )
    return cur.fetchone()[0]

# a merged record points to the entity that it was merged into
def entities_by_name(cur, entity_type):
    cur.execute(
        f"""
        SELECT display_name, COALESCE(merged_into_id, id) 
        FROM entities
        WHERE entity_type = %s
        """,
        (entity_type,),
    )
    return dict(cur.fetchall())

def units_by_code(cur):
    cur.execute(
        """
        SELECT attributes->>'unit_code' , id 
        FROM entities
        WHERE entity_type = 'msu_unit'
            AND attributes->>'unit_code' IS NOT NULL
        """
    )
    return dict(cur.fetchall())

def clear_kuali(cur):
    kuali_records = "SELECT id FROM source_records WHERE source_system = 'kuali'"
    cur.execute(f"""
        DELETE FROM entity_matches
        WHERE left_source_record_id IN ({kuali_records})
            OR right_source_record_id IN ({kuali_records})
    """)
    cur.execute(f"DELETE FROM activities WHERE source_record_id IN ({kuali_records})")
    cur.execute(f"""
        DELETE FROM entities 
        WHERE id IN (
            SELECT entity_id FROM entity_source_records
            WHERE source_record_id IN ({kuali_records})
        )
    """)
    cur.execute("DELETE FROM source_records WHERE source_system = 'kuali'")

def load_sponsors(cur, sponsors):
    sponsor_entities = {}

    for sponsor in sponsors:
        source_id = insert_kuali_source_record(cur,"sponsor", sponsor["sponsorCode"], sponsor)
        name = sponsor["sponsorName"]

        cur.execute(
            """
            INSERT INTO entities (entity_type, display_name, normalized_name, attributes)
            VALUES ('organization', %s, %s, %s)
            RETURNING id
            """,
            (
                name,
                normalize_name(name),
                Jsonb({
                    "sponsor_code": sponsor["sponsorCode"],
                    "sponsor_type": sponsor["sponsorTypeDescription"],
                }),
            ),
        )
        entity_id = cur.fetchone()[0]

        cur.execute(
            "INSERT INTO entity_source_records (entity_id, source_record_id) VALUES (%s,%s)",
            (entity_id, source_id),
        )
        sponsor_entities[sponsor["sponsorCode"]] = entity_id
    
    return sponsor_entities

def award_company(award, sponsor_names, companies):
    sponsor = sponsor_names[award["sponsorCode"]]
    if sponsor in companies:
        return companies[sponsor]
    
    for share in award["costShares"]:
        if share["sourceName"] in companies:
            return companies[share["sourceName"]]
    
    partners = award["customData"]["industryPartners"]
    if partners:
        return companies.get(partners.split(" (")[0])

    return None

def load_awards(cur, awards, sponsors, companies, people, units):
    sponsor_names = {s["sponsorCode"]: s["sponsorName"] for s in sponsors}

    for award in awards:
        source_id = insert_kuali_source_record(cur, "award", award["awardNumber"], award)

        investigators = award["projectPersons"]
        pi = next(p for p in investigators if p["roleCode"] == "PI")
        co_names = [p["personName"] for p in investigators if p["roleCode"] == "COI"]

        restricted = award["customData"]["exportControl"] != "None"
        title = "Restricted research award" if restricted else award["title"]
        notes = f'{award["awardTypeDescription"]}: {title}'
        if co_names:
             notes += f' (Co-investigators: {", ".join(co_names)})'

        cur.execute(
        """
            INSERT INTO activities (company_entity_id,
                person_entity_id,
                msu_unit_entity_id,
                activity_type,
                occurred_on,
                ended_on,
                amount,
                notes,
                source_record_id
            )
            VALUES (%s, %s, %s, 'award', %s, %s, %s, %s, %s)
            """,
            (
                award_company(award, sponsor_names, companies),
                people[pi["personName"]],
                units.get(KUALI_UNITS.get(award["leadUnitNumber"])),
                award["awardEffectiveDate"],
                award["finalExpirationDate"],
                award["anticipatedTotalAmount"],
                notes,
                source_id,
            ),
        )

def main():
    awards = read_json_file(AWARDS_FILE)
    sponsors = read_json_file(SPONSORS_FILE)

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            clear_kuali(cur)

            companies = entities_by_name(cur, "organization")
            people = entities_by_name(cur, "person")
            units = units_by_code(cur)

            sponsor_entities = load_sponsors(cur, sponsors)
            load_awards(cur, awards, sponsors, companies, people, units)

            cur.execute(
                """
                SELECT count(*) 
                FROM activities a 
                JOIN source_records s ON s.id = a.source_record_id
                WHERE s.source_system = 'kuali'
                """
            )
            print(f"kuali awards: {cur.fetchone()[0]}")
            print(f"kuali sponsors: {len(sponsor_entities)}")


if __name__ == "__main__":
    main()  

