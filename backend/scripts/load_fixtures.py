import csv
import os
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb
from company_page_fixtures import get_contact_dates, get_latest_contact_dates, get_giving_amount, count_givings, get_activity_timeline, get_msu_tasks_info


ROOT = Path(__file__).resolve().parents[1]
DATABASE_URL = os.environ["DATABASE_URL"]

ACCOUNT_COLUMNS = {
    "id": "External_ID__c",
    "name": "Name",
    "record_type": "RecordType.Name",
    "industry": "Industry",
    "industry_detail": "Industry_Detail__c", # Get the detail and tier of the industry if tier is available (Zhixiang Miao)
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

#(Alvin)
GIFT_RECORD_TYPES = {"Donation", "In-Kind Gift", "Pledge"}
CLOSED_ASK_STAGES = {"Declined", "Closed - No Action"}


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

    # (Zhixiang Miao) Load contact reports data and get the last company contact date.
    contact_reports = read_csv(
        ROOT / "db" / "seeds" / "10_Contact_Report__c.csv"
    )
    latest_contact_dates = get_latest_contact_dates(contact_reports)

    '''
    (Zhixiang Miao) Load opportunity data and get total giving amount, 
    how many times a company gives in which way, 
    and the activity timeline of the company
    '''
    opportunity = read_csv(
        ROOT / "db" / "seeds" / "07_Opportunity.csv"
    )
    total_giving_amount = get_giving_amount(opportunity)
    giving_counts = count_givings(opportunity)
    activity_timeline = get_activity_timeline(opportunity)

    # (Zhixiang Miao) Load MSU tasks data for the company.
    msu_tasks = get_msu_tasks_info(
        read_csv(ROOT / "db" / "seeds" / "11_Action_Item__c.csv"),
        read_csv(ROOT / "db" / "seeds" / "02_Contact.csv"),
        read_csv(ROOT / "db" / "seeds" / "01_Account.csv"),
        read_csv(ROOT / "db" / "seeds" / "03_npe5__Affiliation__c.csv"),
    )

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
            "latest_contact_date": latest_contact_dates.get(account[ACCOUNT_COLUMNS["id"]]), # (Zhixiang Miao) Added contact date attributes for the company. 
            "total_giving_amount": total_giving_amount.get(account[ACCOUNT_COLUMNS["id"]]), # (Zhixiang Miao) Added giving amount attributes for the company. 
            "giving_counts": giving_counts.get(account[ACCOUNT_COLUMNS["id"]]), # (Zhixiang Miao) List what type of givings from the company and how many times they gave from this type of giving. 
            "industry_detail": account[ACCOUNT_COLUMNS["industry_detail"]], # (Zhixiang Miao) Get the detail, tier (if available) of the industry. 
            "activity_timeline": activity_timeline.get(account[ACCOUNT_COLUMNS["id"]]), # (Zhixiang Miao) Get the activities for the company, (need the format that show in the company page). 
            "msu_tasks": msu_tasks.get(account[ACCOUNT_COLUMNS["id"]]), # (Zhixiang Miao) Get the MSU tasks for the company. 
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
            VALUES (%s, %s, 'employed_by',%s, %s, %s::date + 1, %s)
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

# Loads degree for alumni record (Emmanuel)
def load_degrees(cur, rows, contact_entities):
    for degree in rows:
        source_id = insert_source_record(
            cur,
            "Degree__c",
            degree[DEGREE_COLUMNS["id"]],
            degree,
        )

        cur.execute(
            """
            INSERT INTO degrees (
            person_entity_id,
            degree_type,
            major,
            college,
            class_year,
            source_record_id
            )
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            contact_entities[degree[DEGREE_COLUMNS["contact_id"]]],
            degree[DEGREE_COLUMNS["degree_type"]],
            degree[DEGREE_COLUMNS["major"]],
            degree[DEGREE_COLUMNS["college"]],
            degree[DEGREE_COLUMNS["class_year"]],
            source_id,
        ),
    )

# Loads MSU staff owners of companies (Emmanuel)
def load_relationship_assignments(cur, rows, account_entities, contact_entities):
    for assignment in rows:
        source_id = insert_source_record(
            cur,
            "Relationship_Assignment__c",
            assignment[ASSIGNMENT_COLUMNS["id"]],
            assignment, 
        )
        # has to cover either a comapny or person cant be both
        target_id = (
            account_entities.get(assignment[ASSIGNMENT_COLUMNS["account_id"]])
            or contact_entities.get((assignment[ASSIGNMENT_COLUMNS["contact_id"]]))
        )

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
        VALUES (%s, %s, 'relationship_owner', %s, %s, %s::date + 1, %s)
        """,
        (
            contact_entities[assignment[ASSIGNMENT_COLUMNS["staff_id"]]],
            target_id,
            assignment[ASSIGNMENT_COLUMNS["role"]],
            assignment[ASSIGNMENT_COLUMNS["start_date"]],
            assignment[ASSIGNMENT_COLUMNS["end_date"]],
            source_id,

        ),

    )


# Decides status of opportunity (Alvin)
def opportunity_activity_type_and_status(record_type, stage):
    if record_type in GIFT_RECORD_TYPES:
        return "gift", None
    if record_type == "Proposal":
        if stage in CLOSED_ASK_STAGES:
            return "ask", "closed"
        return "ask", "open"
    raise ValueError(f"Unsupported Opportunity record type: {record_type}")

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
            opp["RecordType.Name"], opp["StageName"]
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
    degrees = read_csv(
        ROOT / "db" / "seeds" / "04_Degree__c.csv"
    )
    assignments = read_csv(
        ROOT / "db" / "seeds" / "05_Relationship_Assignment__c.csv"
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
            load_degrees(cur, degrees, contact_entities)
            load_relationship_assignments(cur, assignments, account_entities, contact_entities)

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