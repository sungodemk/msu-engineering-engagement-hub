import csv
import os
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb


ROOT = Path(__file__).resolve().parents[1]
DATABASE_URL = os.environ["DATABASE_URL"]

ACCOUNT_COLUMNS = {
    "id": "External_ID__c",
    "name": "Name",
    "record_type": "RecordType.Name",
    "industry": "Industry",
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
#(Emmanuel)
AFFILIATION_COLUMNS = {
    "id": "External_ID__c",
    "contact_id": "npe5__Contact__r.External_ID__c",
    "organization_id": "npe5__Organization__r.External_ID__c",
    "role": "npe5__Role__c",
    "start_date": "npe5__StartDate__c",
    "end_date": "npe5__EndDate__c",
}

ACCOUNT_TYPES = {
    "Business Organization": "organization",
    "University Department": "msu_unit",
    "Educational Institution": "msu_unit",
    "Academic Program": "msu_unit",
}


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        return [
            {
                key: value if value != "" else None
                for key, value in row.items()
            }
            for row in reader
        ]


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
        INSERT INTO source_records (
            source_system,
            source_table,
            source_pk,
            payload
        )
        VALUES (%s, %s, %s, %s)
        RETURNING id
        """,
        ("salesforce", source_table, source_pk, Jsonb(payload)),
    )
    return cur.fetchone()[0]


def insert_entity(cur, entity_type, display_name, email, attributes):
    cur.execute(
        """
        INSERT INTO entities (
            entity_type,
            display_name,
            normalized_name,
            email,
            attributes
        )
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
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
        INSERT INTO entity_source_records (
            entity_id,
            source_record_id
        )
        VALUES (%s, %s)
        """,
        (entity_id, source_record_id),
    )


def load_accounts(cur, rows):
    account_entities = {}

    for account in rows:
        record_type = account[ACCOUNT_COLUMNS["record_type"]]

        if record_type not in ACCOUNT_TYPES:
            raise ValueError(
                f"Unsupported Account record type: {record_type}"
            )

        source_id = insert_source_record(
            cur,
            "Account",
            account[ACCOUNT_COLUMNS["id"]],
            account,
        )

        # companies such as UM Digital are not treated as duplicates.
        attributes = remove_nulls({
            "record_type": record_type,
            "industry": account[ACCOUNT_COLUMNS["industry"]],
            "city": account[ACCOUNT_COLUMNS["city"]],
            "state": account[ACCOUNT_COLUMNS["state"]],
            "unit_code": account[ACCOUNT_COLUMNS["unit_code"]],
            "parent_external_id": account[ACCOUNT_COLUMNS["parent_id"]],
        })

        entity_id = insert_entity(
            cur,
            ACCOUNT_TYPES[record_type],
            account[ACCOUNT_COLUMNS["name"]],
            None,
            attributes,
        )

        account_entities[account[ACCOUNT_COLUMNS["id"]]] = entity_id
        link_entity(cur, entity_id, source_id)

    return account_entities


def load_contacts(cur, rows):
    contact_entities = {}

    for contact in rows:
        source_id = insert_source_record(
            cur,
            "Contact",
            contact[CONTACT_COLUMNS["id"]],
            contact,
        )

        display_name = (
            f'{contact[CONTACT_COLUMNS["first_name"]]} '
            f'{contact[CONTACT_COLUMNS["last_name"]]}'
        ).strip()

        attributes = remove_nulls({
            "title": contact[CONTACT_COLUMNS["title"]],
            "city": contact[CONTACT_COLUMNS["city"]],
            "state": contact[CONTACT_COLUMNS["state"]],
            "constituent_type":
                contact[CONTACT_COLUMNS["constituent_type"]],
            "deceased":
                to_bool(contact[CONTACT_COLUMNS["deceased"]]),
            "do_not_contact":
                to_bool(contact[CONTACT_COLUMNS["do_not_contact"]]),
            "do_not_solicit":
                to_bool(contact[CONTACT_COLUMNS["do_not_solicit"]]),
        })

        entity_id = insert_entity(
            cur,
            "person",
            display_name,
            contact[CONTACT_COLUMNS["email"]],
            attributes,
        )

        contact_entities[contact[CONTACT_COLUMNS["id"]]] = entity_id
        link_entity(cur, entity_id, source_id)

    return contact_entities
    
# loading affiliations into perons page (Emmanuel)
def load_affiliations(cur, rows, account_entities, contact_entities):
    for affiliation in rows:
        source_id = insert_source_record(
            cur, 
            "npe5__Affiliation__c",
            affiliation[AFFILIATION_COLUMNS["id"]],
            affiliation,
        )
        # current jobs dont have a end date so valid_to stays NULL
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
            VALUES (%s, %s, 'employed_by',%s, %s, %s, %s)
            """,
            (
                contact_entities[affiliation[AFFILIATION_COLUMNS["contact_id"]]],
                account_entities[affiliation[AFFILIATION_COLUMNS["organization_id"]]],
                affiliation[AFFILIATION_COLUMNS["role"]],
                affiliation[AFFILIATION_COLUMNS["start_date"]],
                affiliation[AFFILIATION_COLUMNS["end_date"]],
                source_id,

            ),
        )
            
            
            
            
def main():
    accounts = read_csv(
        ROOT / "db" / "seeds" / "01_Account.csv"
    )
    contacts = read_csv(
        ROOT / "db" / "seeds" / "02_Contact.csv"
    )

    affiliations = read_csv(
        ROOT / "db" / "seeds" / "03_npe5__Affiliation__c.csv"
    )

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # the cascade clears rows in tables that depend on these records.
            cur.execute(
                "TRUNCATE TABLE entities, source_records CASCADE"
            )

            # keep mappings for affiliations and other files added later.
            account_entities = load_accounts(cur, accounts)
            contact_entities = load_contacts(cur, contacts)
            load_affiliations(cur, affiliations, account_entities, contact_entities)

            for table in [
                "source_records",
                "entities",
                "entity_source_records",
                "edges",
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


if __name__ == "__main__":
    main()