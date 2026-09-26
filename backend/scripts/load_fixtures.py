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

#(Alvin)
# Opportunity.StageName -> our activities.activity_type / status
GIFT_STAGES = {"Closed Won", "Funded"}
CLOSED_ASK_STAGES = {"Declined", "Closed - No Action"}
# everything else (Cultivation, Identified, Proposal Submitted,
# Proposal in Development, Company Review, On Hold, Pledged)
# is treated as an open ask.


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
    units_by_code = {}

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

        #(alvin)
        # msu_unit accounts has a unit_code (ex: "ecr") that Opportunity.Owning_Unit__c references,
        # since Owning_Unit__c is a code, not an External_ID__c.
        unit_code = account[ACCOUNT_COLUMNS["unit_code"]]
        if ACCOUNT_TYPES[record_type] == "msu_unit" and unit_code:
            units_by_code[unit_code] = entity_id

    return account_entities, units_by_code


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

# Decides status of opportunity (Alvin)
def opportunity_activity_type_and_status(stage):
    if stage in GIFT_STAGES:
        return "gift", None
    if stage in CLOSED_ASK_STAGES:
        return "ask", "closed"
    return "ask", "open"

# Loads opportunities into portfolio and temporal page (Alvin)
def load_opportunities(cur, rows, account_entities, contact_entities,
                        units_by_code):
    # Safety check for dangling Account.External_ID__c references (none for now)
    skipped_no_account = 0

    for opp in rows:
        account_id = opp["Account.External_ID__c"]
        company_entity_id = account_entities.get(account_id)

        if company_entity_id is None:
            skipped_no_account += 1
            continue

        source_id = insert_source_record(
            cur, "Opportunity", opp["External_ID__c"], opp,
        )
        activity_type, status = opportunity_activity_type_and_status(
            opp["StageName"]
        )
        person_entity_id = contact_entities.get(
            opp["npsp__Primary_Contact__r.External_ID__c"]
        )
        owner_entity_id = contact_entities.get(
            opp["Solicitor__r.External_ID__c"]
        )
        unit_entity_id = units_by_code.get(opp["Owning_Unit__c"])

        amount = opp["Amount"]
        notes_parts = [opp["Name"]]
        if opp["Type"]:
            notes_parts.append(f'({opp["Type"]})')
        if opp["Gift_Memo__c"]:
            notes_parts.append(opp["Gift_Memo__c"])
        notes = " ".join(notes_parts)

        cur.execute("""
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
            """,(
                company_entity_id,
                person_entity_id,
                unit_entity_id,
                activity_type,
                opp["CloseDate"],
                None,
                amount,
                status,
                owner_entity_id,
                notes,
                source_id,
            ),
        )

    # Prints a warning if any opportunities were skipped due to missing account references
    if skipped_no_account:
        print(
            f"Skipped {skipped_no_account} opportunities with no "
            f"matching Account (dangling Account.External_ID__c)"
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
    opportunities = read_csv(
        ROOT / "db" / "seeds" / "07_Opportunity.csv"
    )

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # the cascade clears rows in tables that depend on these records.
            cur.execute(
                "TRUNCATE TABLE entities, source_records CASCADE"
            )

            # keep mappings for affiliations and other files added later.
            account_entities, units_by_code = load_accounts(cur, accounts)
            contact_entities = load_contacts(cur, contacts)
            load_affiliations(cur, affiliations, account_entities, contact_entities)
            load_opportunities(cur, opportunities, account_entities, contact_entities, units_by_code)
            for table in [
                "source_records",
                "entities",
                "entity_source_records",
                "edges",
                "activities",
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