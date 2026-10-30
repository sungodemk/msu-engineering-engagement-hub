-- migrate:up

-- records the reviewing account even without a linked staff person (Aayush)
ALTER TABLE entity_matches
    ADD COLUMN reviewed_by_user_id uuid
        REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE entity_matches
    DROP CONSTRAINT chk_entity_matches_review_state;

ALTER TABLE entity_matches
    ADD CONSTRAINT chk_entity_matches_review_state
    CHECK (
        (
            status IN ('pending_review', 'auto_rejected')
            AND entity_id IS NULL
            AND reviewed_by_entity_id IS NULL
            AND reviewed_by_user_id IS NULL
            AND reviewed_at IS NULL
        )
        OR
        (
            status = 'auto_accepted'
            AND entity_id IS NOT NULL
            AND reviewed_by_entity_id IS NULL
            AND reviewed_by_user_id IS NULL
            AND reviewed_at IS NULL
        )
        OR
        (
            status = 'confirmed'
            AND entity_id IS NOT NULL
            AND reviewed_at IS NOT NULL
        )
        OR
        (
            status = 'rejected'
            AND entity_id IS NULL
            AND reviewed_at IS NOT NULL
        )
    );


-- migrate:down

ALTER TABLE entity_matches
    DROP CONSTRAINT chk_entity_matches_review_state;

ALTER TABLE entity_matches
    DROP COLUMN reviewed_by_user_id;

-- restores the original requirement for a linked staff reviewer 
ALTER TABLE entity_matches
    ADD CONSTRAINT chk_entity_matches_review_state
    CHECK (
        (
            status IN ('pending_review', 'auto_rejected')
            AND entity_id IS NULL
            AND reviewed_by_entity_id IS NULL
            AND reviewed_at IS NULL
        )
        OR
        (
            status = 'auto_accepted'
            AND entity_id IS NOT NULL
            AND reviewed_by_entity_id IS NULL
            AND reviewed_at IS NULL
        )
        OR
        (
            status = 'confirmed'
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
    );