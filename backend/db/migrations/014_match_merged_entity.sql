-- migrate:up

-- tracks the exact duplicate merged by a match (Aayush)
ALTER TABLE entity_matches
ADD COLUMN merged_entity_id uuid REFERENCES entities(id);

-- pending and rejected matches must not own a merge
ALTER TABLE entity_matches
ADD CONSTRAINT chk_entity_matches_merged_entity_status
CHECK (
    merged_entity_id IS NULL
    OR status IN ('confirmed', 'auto_accepted')
);

-- migrate:down
ALTER TABLE entity_matches
DROP CONSTRAINT chk_entity_matches_merged_entity_status;

ALTER TABLE entity_matches
DROP COLUMN merged_entity_id;