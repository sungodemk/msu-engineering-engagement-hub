-- migrate:up

CREATE TABLE entity_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    left_source_record_id uuid NOT NULL REFERENCES source_records(id),
    right_source_record_id uuid NOT NULL REFERENCES source_records(id),

    -- Match confidence score between 0 and 1.000
    score numeric(4, 3) NOT NULL,

    -- Stores reasoning for match scores
    match_reasons text[] NOT NULL DEFAULT ARRAY[]::text[],

    -- matches enter queue by default
    status text NOT NULL DEFAULT 'pending_review',

    -- populating when match resolves to an entity
    entity_id uuid REFERENCES entities(id),

    -- Human review
    reviewed_by_entity_id uuid REFERENCES entities(id),

    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_entity_matches_source_records
        CHECK (
            left_source_record_id <> right_source_record_id
        ),

    CONSTRAINT chk_entity_matches_score
        CHECK (
            score >= 0 
            AND score <= 1
        ),

    CONSTRAINT chk_entity_matches_status
        CHECK (
            status IN (
                'auto_accepted',
                'pending_review',
                'confirmed',
                'rejected'
            )
        ),

    -- review metadata agrees with current status
    CONSTRAINT chk_entity_matches_review_state
        CHECK (
            (
                status = 'pending_review'
                AND entity_id IS NULL
                AND reviewed_by_entity_id IS NULL
                AND reviewed_at IS NULL
            )
            or
            (
                status = 'auto_accepted'
                AND entity_id IS NOT NULL
                AND reviewed_by_entity_id IS NULL
                AND reviewed_at IS NULL
            )
            OR
            (
                status IN ('confirmed')
                AND entity_id IS NOT NULL
                AND reviewed_by_entity_id IS NOT NULL
                AND reviewed_at IS NOT NULL
            )
            OR
            (
                status = 'rejected'
                AND entity_id IS NULL
                AND reviewed_by_entity_id IS NOT NULL
                AND reviewed_at IS NOT NULL
            )
        )
);

-- Normalizes pair orders so (A,B) and (B,A) aren't stored
CREATE UNIQUE INDEX uq_entity_matches_unique_pair
    ON entity_matches (
        LEAST(left_source_record_id, right_source_record_id),
        GREATEST(left_source_record_id, right_source_record_id)
    );

-- filters stewardship queue by status
CREATE INDEX idx_entity_matches_status
    ON entity_matches (status);

-- migrate:down

DROP TABLE entity_matches;