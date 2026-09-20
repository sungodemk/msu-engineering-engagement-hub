import json
import os
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb


ROOT = Path(__file__).resolve().parents[1]
DATABASE_URL = os.environ["DATABASE_URL"]


def normalize_name(name):
    return name.strip().lower()


# stores raw fixture record as JSONB and keep the generated database ID 
# so normalized rows can trace back to the source record
def insert_source_record(cur, system, table, record_id, payload):
    cur.execute(
        """
        INSERT INTO source_records (
            source_system,
            source_table,
            source_pk,
            payload
        )
        VALUES (%s, %s, %s, %s)
        RETURNING id
        """,
        (system, table, record_id, Jsonb(payload)),
    )
    return cur.fetchone()[0]


def insert_entity(cur, entity_type, display_name):
    cur.execute(
        """
        INSERT INTO entities (
            entity_type,
            display_name,
            normalized_name
        )
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (entity_type, display_name, normalize_name(display_name)),
    )
    return cur.fetchone()[0]


# links each normalized entity back to the raw source record it was generated from
def link_entity(cur, entity_id, source_record_id):
    cur.execute(
        """
        INSERT INTO entity_source_records (
            entity_id,
            source_record_id
        )
        VALUES (%s, %s)
        """,
        (entity_id, source_record_id),
    )

def insert_affiliations(cur, salesforce, contacts, accounts, source_ids):
    for affiliation in salesforce["affiliations"]:
        cur.execute(
            """
            INSERT INTO edges (
                from_entity_id,
                to_entity_id,
                edge_type,
                edge_role,
                valid_from,
                valid_to,
                source_record_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                contacts[affiliation["ContactId"]],
                accounts[affiliation["AccountId"]],
                "employed_by",
                affiliation["Role__c"],
                affiliation["StartDate__c"],
                affiliation["EndDate__c"],
                source_ids[affiliation["Id"]],
            ),
        )


def main():
    with open(
        ROOT / "db" / "seeds" / "salesforce.json",
        encoding="utf-8",
    ) as f:
        salesforce = json.load(f)

    with open(
        ROOT / "db" / "seeds" / "kuali_awards.json",
        encoding="utf-8",
    ) as f:
        kuali = json.load(f)

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # clears previously loaded fixture data so rerunning this script
            # produces the same result instead of duplicating rows.
            cur.execute(
                """
                TRUNCATE TABLE entities, source_records CASCADE
                """
            )

            source_ids = {}

            for group, records in salesforce.items():
                for record in records:
                    source_ids[record["Id"]] = insert_source_record(
                        cur,
                        "salesforce",
                        group,
                        record["Id"],
                        record,
                    )

            for award in kuali:
                source_ids[award["awardId"]] = insert_source_record(
                    cur,
                    "kuali",
                    "awards",
                    award["awardId"],
                    award,
                )

            accounts = {}
            contacts = {}
            users = {}
            units = {}
            sponsors = {}

            for account in salesforce["accounts"]:
                entity_id = insert_entity(
                    cur,
                    "organization",
                    account["Name"],
                )
                accounts[account["Id"]] = entity_id
                link_entity(
                    cur,
                    entity_id,
                    source_ids[account["Id"]],
                )

            for contact in salesforce["contacts"]:
                name = f'{contact["FirstName"]} {contact["LastName"]}'

                entity_id = insert_entity(
                    cur,
                    "person",
                    name,
                )
                contacts[contact["Id"]] = entity_id
                link_entity(
                    cur,
                    entity_id,
                    source_ids[contact["Id"]],
                )

            for user in salesforce["users"]:
                entity_id = insert_entity(
                    cur,
                    "person",
                    user["Name"],
                )
                users[user["Id"]] = entity_id
                link_entity(
                    cur,
                    entity_id,
                    source_ids[user["Id"]],
                )

                unit_name = user["Unit__c"]

                # reuses one entity when the same MSU unit appears in multiple records
                if unit_name not in units:
                    units[unit_name] = insert_entity(
                        cur,
                        "msu_unit",
                        unit_name,
                    )

            for award in kuali:
                unit_name = award["leadUnit"]

                if unit_name not in units:
                    units[unit_name] = insert_entity(
                        cur,
                        "msu_unit",
                        unit_name,
                    )

                sponsor_name = award["sponsorName"]

                if sponsor_name not in sponsors:
                    sponsors[sponsor_name] = insert_entity(
                        cur,
                        "organization",
                        sponsor_name,
                    )

                link_entity(
                    cur,
                    sponsors[sponsor_name],
                    source_ids[award["awardId"]],
                )

            for task in salesforce["tasks"]:
                task_type = task["Type"].lower()

                # converts Salesforce task types into the activity types used by our schema
                if task_type == "meeting":
                    activity_type = "touchpoint"
                    status = None
                elif task_type == "ask":
                    activity_type = "ask"
                    status = task["Status"].lower()
                else:
                    raise ValueError(
                        f"Unsupported task type: {task['Type']}"
                    )

                notes = f'{task["Subject"]}: {task["Description"]}'

                cur.execute(
                    """
                    INSERT INTO activities (
                        company_entity_id,
                        person_entity_id,
                        msu_unit_entity_id,
                        activity_type,
                        occurred_on,
                        ended_on,
                        amount,
                        status,
                        owner_entity_id,
                        notes,
                        source_record_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        accounts[task["WhatId"]],
                        contacts[task["WhoId"]],
                        None, # disclaimer: task owner does not necessarily identify the MSU unit for the activity
                        activity_type,
                        task["ActivityDate"],
                        None,
                        None,
                        status,
                        users[task["OwnerId"]],
                        notes,
                        source_ids[task["Id"]],
                    ),
                )

            for award in kuali:
                cur.execute(
                    """
                    INSERT INTO activities (
                        company_entity_id,
                        person_entity_id,
                        msu_unit_entity_id,
                        activity_type,
                        occurred_on,
                        ended_on,
                        amount,
                        status,
                        owner_entity_id,
                        notes,
                        source_record_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        sponsors[award["sponsorName"]],
                        None,
                        units[award["leadUnit"]],
                        "award",
                        award["startDate"],
                        award["endDate"],
                        award["totalAmount"],
                        None, # activities.status is reserved for asks
                        None,
                        award["title"],
                        source_ids[award["awardId"]],
                    ),
                )

            insert_affiliations(
                cur,
                salesforce,
                contacts,
                accounts,
                source_ids,
            )

            # prints basic row counts so the fixture load can be checked immediately 
            for table in [
                "source_records",
                "entities",
                "entity_source_records",
                "activities",
                "edges",
            ]:
                cur.execute(f"SELECT count(*) FROM {table}")
                print(f"{table}: {cur.fetchone()[0]}")


if __name__ == "__main__":
    main()