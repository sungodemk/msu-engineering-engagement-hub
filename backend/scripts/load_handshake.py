import os
from pathlib import Path
import json
import psycopg
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
DATABASE_URL = os.environ["DATABASE_URL"]

ACCOUNT_COLUMNS = {
    "id": "External_ID__c",
    "name": "Name",
    "record_type": "RecordType.Name",
    "industry": "Industry",
    "industry_detail": "Industry_Detail__c",
    "city": "BillingCity",
    "state": "BillingState",
    "unit_code": "Unit_Code__c",
    "parent_id": "Parent.External_ID__c",
}

CONTACT_COLUMNS = {
    "id": "External_ID__c",
    "first_name": "FirstName",
    "last_name": "LastName",
    "email": "Email",
    "title": "Title",
    "city": "MailingCity",
    "state": "MailingState",
    "constituent_type": "Constituent_Type__c",
    "deceased": "npsp__Deceased__c",
    "do_not_contact": "npsp__Do_Not_Contact__c",
    "do_not_solicit": "Do_Not_Solicit__c",
}
# (Emmanuel)
AFFILIATION_COLUMNS = {
    "id": "External_ID__c",
    "contact_id": "npe5__Contact__r.External_ID__c",
    "organization_id": "npe5__Organization__r.External_ID__c",
    "role": "npe5__Role__c",
    "start_date": "npe5__StartDate__c",
    "end_date": "npe5__EndDate__c",
}

DEGREE_COLUMNS = {
    "id": "External_ID__c",
    "contact_id": "Contact__r.External_ID__c",
    "degree_type": "Degree_Type__c",
    "major": "Major__c",
    "college": "College__c",
    "class_year": "Class_Year__c",

}

ASSIGNMENT_COLUMNS = {
    "id": "External_ID__c",
    "staff_id": "Staff__r.External_ID__c",
    "account_id": "Account__r.External_ID__c",
    "contact_id": "Contact__r.External_ID__c",
    "role": "Role__c",
    "start_date": "Start_Date__c",
    "end_date": "End_Date__c",

}

ACCOUNT_TYPES = {
    "Business Organization": "organization",
    "University Department": "msu_unit",
    "Educational Institution": "msu_unit",
    "Academic Program": "msu_unit",
}

# (Alvin)
GIFT_RECORD_TYPES = {"Donation", "In-Kind Gift", "Pledge"}
CLOSED_ASK_STAGES = {"Declined", "Closed - No Action"}


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def normalize_name(name):
    return name.strip().lower()


def to_bool(value):
    return value == "TRUE"

def remove_nulls(attributes):
    return {
        key: value
        for key, value in attributes.items()
        if value is not None
    }

def insert_source_record(cur, source_table, source_pk, payload):
    cur.execute(
        """
        INSERT INTO source_records (source_system,
                                    source_table,
                                    source_pk,
                                    payload)
        VALUES (%s, %s, %s, %s) RETURNING id
        """,
        ("handshake", source_table, source_pk, Jsonb(payload)),
    )
    return cur.fetchone()[0]


def insert_entity(cur, entity_type, display_name, email, attributes):
    cur.execute(
        """
        INSERT INTO entities (entity_type,
                              display_name,
                              normalized_name,
                              email,
                              attributes)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        (
            entity_type,
            display_name,
            normalize_name(display_name),
            email,
            Jsonb(attributes),
        ),
    )
    return cur.fetchone()[0]


def link_entity(cur, entity_id, source_record_id):
    cur.execute(
        """
        INSERT INTO entity_source_records (entity_id,
                                           source_record_id)
        VALUES (%s, %s)
        """,
        (entity_id, source_record_id),
    )

# Loads handshake employers (Alvin)
def load_handshake_employers(cur, rows, industries):
    employer_entities = {}
    industries_by_id = {industry["id"]: industry["name"] for industry in industries}

    for employer in rows:
        source_id = insert_source_record(
            cur, "Employer", str(employer["id"]), employer,
        )

        city, comma, state = (employer["address"] or "").partition(",")
        industry = industries_by_id.get(employer["industry_id"])
        attributes = remove_nulls({
            "city": city.strip() or None,
            "state": state.strip() or None,
            "size": employer["size"],
            "email": employer["email"],  # email column is only for people
            "industry": industry,
            "record_type": "Business Organization",
            "parent_external_id": (
                str(employer["affiliation_parent_employer_ids"][0])
                if employer["affiliation_parent_employer_ids"]
                else None
            ),
        })

        entity_id = insert_entity(
            cur,
            "organization",
            employer["name"],
            None,
            attributes,
        )

        employer_entities[employer["id"]] = entity_id
        link_entity(cur, entity_id, source_id)

    return employer_entities


def load_recruiting_career_fairs(cur, rows, fairs, employer_entities):
    fairs_by_id = {fair["id"]: fair for fair in fairs}
    skipped_no_employer = 0

    for row in rows:
        if row["registration_status"] != "approved":
            continue

        company_entity_id = employer_entities.get(row["employer_id"])
        if company_entity_id is None:
            skipped_no_employer += 1
            continue

        fair = fairs_by_id.get(row["career_fair_id"])
        source_id = insert_source_record(
            cur,
            "CareerFairEmployerEngagement",
            f'{row["career_fair_id"]}:{row["employer_id"]}',
            row,
        )

        # Only date portion
        occurred_on = fair["start_date_time"][:10]
        notes = fair["name"]

        cur.execute("""
                    INSERT INTO activities (company_entity_id,
                                            person_entity_id,
                                            msu_unit_entity_id,
                                            activity_type,
                                            sub_type,
                                            occurred_on,
                                            ended_on,
                                            amount,
                                            status,
                                            owner_entity_id,
                                            notes,
                                            source_record_id)
                    VALUES (%s, NULL, NULL, 'recruiting', 'Career Fair', %s, NULL, NULL, NULL, NULL, %s, %s)
                    """,
                    (company_entity_id, occurred_on, notes, source_id),
                    )
    if skipped_no_employer:
        print(f"Skipped {skipped_no_employer} career fair engagements with no matching Employer")


def load_recruiting_events(cur, rows, events, employer_entities):
    events_by_id = {event["id"]: event for event in events}
    skipped_no_employer = 0

    for row in rows:
        company_entity_id = employer_entities.get(row["employer_id"])
        if company_entity_id is None:
            skipped_no_employer += 1
            continue

        event = events_by_id[row["event_id"]]
        source_id = insert_source_record(
            cur,
            "EventEmployerEngagement",
            f'{row["event_id"]}:{row["employer_id"]}',
            row,
        )

        # Only date portion
        occurred_on = event["start_date_time"][:10]
        notes = event["name"]

        cur.execute("""
                    INSERT INTO activities (company_entity_id,
                                            person_entity_id,
                                            msu_unit_entity_id,
                                            activity_type,
                                            sub_type,
                                            occurred_on,
                                            ended_on,
                                            amount,
                                            status,
                                            owner_entity_id,
                                            notes,
                                            source_record_id)
                    VALUES (%s, NULL, NULL, 'recruiting', %s, %s, NULL, NULL, NULL, NULL, %s, %s)
                    """,
                    (company_entity_id, event["type"], occurred_on, notes, source_id),
                    )
    if skipped_no_employer:
        print(f"Skipped {skipped_no_employer} event engagements with no matching Employer")


def main():

    employers = read_json(
        ROOT / "db" / "handshake" / "employers.json"
    )
    industries = read_json(
        ROOT / "db" / "handshake" / "industries.json"
    )
    career_fairs = read_json(
        ROOT / "db" / "handshake" / "career_fairs.json"
    )
    events = read_json(
        ROOT / "db" / "handshake" / "events.json"
    )
    cfee = read_json(
        ROOT / "db" / "handshake" / "career_fair_employer_engagement.json"
    )
    eee = read_json(
        ROOT / "db" / "handshake" / "event_employer_engagement.json"
    )

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            employer_entities = load_handshake_employers(cur, employers, industries)
            load_recruiting_career_fairs(cur, cfee, career_fairs, employer_entities)
            load_recruiting_events(cur, eee, events, employer_entities)

            for table in [
                "source_records",
                "entities",
                "entity_source_records",
                "edges",
                "activities",
                "degrees",
            ]:
                cur.execute(f"SELECT count(*) FROM {table}")
                print(f"{table}: {cur.fetchone()[0]}")

            cur.execute(
                """
                SELECT entity_type, count(*)
                FROM entities
                GROUP BY entity_type
                ORDER BY entity_type
                """
            )

            for entity_type, count in cur.fetchall():
                print(f"{entity_type}: {count}")

            cur.execute(
                """
                SELECT activity_type, count(*)
                FROM activities
                GROUP BY activity_type
                ORDER BY activity_type
                """
            )
            for activity_type, count in cur.fetchall():
                print(f"{activity_type}: {count}")


if __name__ == "__main__":
    main()