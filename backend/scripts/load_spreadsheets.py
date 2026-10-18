import os
from pathlib import Path
import csv
from decimal import Decimal
import psycopg
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
DATABASE_URL = os.environ["DATABASE_URL"]

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

def splitter(value):
    return [section.strip() for section in value.split(",") if section.strip()]

def feeConverter(value):
    if not value:
        return None
    return Decimal(value.strip("$").replace(",", "").strip())

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
        ("handshake", source_table, source_pk, Jsonb(payload)),
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

def load_sponsorships(cur, rows):
    sponsors = {}
    contacts = {}

    cur.execute("""
    SELECT normalized_name, id FROM entities
    WHERE entity_type = 'msu_unit'
    """)
    msu_units = dict(cur.fetchall())

    for row in rows:
        sponsor = row["Sponsor"].strip()
        if sponsor not in sponsors:
            source_id = insert_source_record(
                cur,
                "Capstone_Sponsorship",
                row["Project ID"] + "-S",
                row,
            )

            entity_id = insert_entity(
                cur,
                "organization",
                sponsor,
                None,
                {"record_type": "Business Organization"}
            )

            sponsors[sponsor] = entity_id
            link_entity(cur, entity_id, source_id)

        sponsor_entity_id = sponsors[sponsor]

        # Some sponsors have multiple contacts
        names = splitter(row["Sponsor Contact(s)"])
        emails = splitter(row["Contact Email(s)"])
        contact_ids = []

        for name, email in zip(names, emails):
            if email not in contacts:
                source_id = insert_source_record(
                    cur,
                    "Capstone_Sponsorship",
                    row["Project ID"] + "-C",
                    row,
                )

                entity_id = insert_entity(
                    cur,
                    "person",
                    name,
                    row["Contact Email(s)"],
                    {},
                )

                contacts[email] = entity_id
                link_entity(cur, entity_id, source_id)

            contact_ids.append(contacts[email])

        source_id = insert_source_record(
            cur,
            "Capstone_Sponsorship",
            row["Project ID"],
            row,
        )

        unit_name = "Department of " + row["Department"]
        msu_entity_id = msu_units.get(normalize_name(unit_name))
        title = row["Project Title"].strip()
        semester = row["Semester"].strip()
        amount = feeConverter(row["Sponsorship Fee"])
        status = row["Status"].strip()
        notes_parts = [row["Short Description"].strip(), f'Team Size: {row["Team Size"]}']
        if row ["Design Day Recognition"]:
            notes_parts.append(row["Design Day Recognition"])
        if row["Coordinator Notes"]:
            notes_parts.append(row["Coordinator Notes"])
        if len(names) > 1:
            notes_parts.append(f'Additional sponsor contact: {"; ".join(names[1:])}')

        notes = " - ".join(notes_parts)

        cur.execute("""
            INSERT INTO capstone (
                company_entity_id,
                person_entity_id,
                msu_unit_entity_id,
                title,
                semester,
                amount,
                status,
                notes,
                source_record_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            sponsor_entity_id,
            contact_ids[0],
            msu_entity_id,
            title,
            semester,
            amount,
            status,
            notes,
            source_id
            ),
        )


def main():
    capstone_rows = read_csv(
        ROOT / "db" / "spreadsheets" / "MSU Engagement Hub Capstone Projects 2021-2026.csv"
    )

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            load_sponsorships(cur, capstone_rows)

            cur.execute(f"SELECT COUNT(*) FROM capstone")
            print(f"Capstone Sponsorships: {cur.fetchone()[0]}")

if __name__ == "__main__":
    main()