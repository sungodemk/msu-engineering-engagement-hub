-- migrate:up
Create Table activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entities
    company_entity_id uuid REFERENCES entities(id),
    person_entity_id uuid REFERENCES entities(id),
    msu_unit_entity_id uuid REFERENCES entities(id),

    -- Restricted to activity types supported at the moment
    activity_type text NOT NULL, 

    -- Tracking activities by day
    occurred_on date not NULL,

    ended_on date,

    -- null for touchpoints, since they have no monetary value
    amount numeric(12, 2),

    -- asks
    status text,

    -- MSU staff are entities
    owner_entity_id uuid REFERENCES entities(id),

    -- notes for touchpoints
    notes text,

    source_record_id uuid NOT NULL REFERENCES source_records(id),

    -- all activities must involve an entity 
    CONSTRAINT chk_activities_has_entity
        CHECK (
            company_entity_id IS NOT NULL 
            OR person_entity_id IS NOT NULL
        ),

    
    CONSTRAINT chk_activities_date_range
        CHECK (
            ended_on IS NULL OR 
            ended_on >= occurred_on
        ),


    CONSTRAINT chk_activities_type
        CHECK (
            activity_type IN (
                'gift',
                'touchpoint',
                'ask',
                'award',
                'recruiting'
            )
        ),

    -- ask must be open or closed
    CONSTRAINT chk_activities_status
        CHECK (
            (activity_type = 'ask' AND status IS NOT NULL AND status IN ('open', 'closed'))
            OR
            (activity_type <> 'ask' AND status IS NULL)
        )
);

-- Common timelines and entity lookup queries
CREATE INDEX idx_activities_company
    ON activities (company_entity_id);

CREATE INDEX idx_activities_person
    ON activities (person_entity_id);

CREATE INDEX idx_activities_msu_unit
    ON activities (msu_unit_entity_id);

CREATE INDEX idx_activities_dates
    ON activities (occurred_on);

-- Traces data back to its source
CREATE INDEX idx_activities_source_record
    ON activities (source_record_id);

-- migrate:down
DROP TABLE activities;