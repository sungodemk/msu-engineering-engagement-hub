-- migrate:up

-- adds auto_rejected so matches under 60% can be stored and shown on the discarded page
ALTER TABLE entity_matches
DROP CONSTRAINT chk_entity_matches_status;

ALTER TABLE entity_matches
ADD CONSTRAINT chk_entity_matches_status
CHECK (
    status IN (
        'auto_accepted',
        'auto_rejected',
        'pending_review',
        'confirmed',
        'rejected'
    )
);

ALTER TABLE entity_matches
DROP CONSTRAINT chk_entity_matches_review_state;

ALTER TABLE entity_matches
ADD CONSTRAINT chk_entity_matches_review_state
CHECK (
    (
        status = 'pending_review'
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
        status = 'auto_rejected'
        AND entity_id IS NULL
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


-- migrate:down

-- remove auto_rejected rows first or the old constraint would fail
DELETE FROM entity_matches
WHERE status = 'auto_rejected';

ALTER TABLE entity_matches
DROP CONSTRAINT chk_entity_matches_status;

ALTER TABLE entity_matches
ADD CONSTRAINT chk_entity_matches_status
CHECK (
    status IN (
        'auto_accepted',
        'pending_review',
        'confirmed',
        'rejected'
    )
);

ALTER TABLE entity_matches
DROP CONSTRAINT chk_entity_matches_review_state;

ALTER TABLE entity_matches
ADD CONSTRAINT chk_entity_matches_review_state
CHECK (
    (
        status = 'pending_review'
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