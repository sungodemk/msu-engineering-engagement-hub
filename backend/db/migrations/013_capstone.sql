-- migrate:up
Create Table capstone (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Entities
    company_entity_id uuid REFERENCES entities(id),
    person_entity_id uuid REFERENCES entities(id),
    msu_unit_entity_id uuid REFERENCES entities(id),

    title text NOT NULL,

    -- Semester is shown through "Fall 2023" or "Spring 2024" format
    semester text NOT NULL,

    -- Sponsorship fee
    amount numeric(12, 2),

    -- Shows if in progress or completed
    status text NOT NULL ,

    -- Leftover Notes
    notes text,

    source_record_id uuid NOT NULL REFERENCES source_records(id),

    -- all sponsorships must involve an entity
    CONSTRAINT chk_capstone_has_entity
        CHECK (
            company_entity_id IS NOT NULL
            OR person_entity_id IS NOT NULL
        )

);

-- migrate:down
DROP TABLE capstone;