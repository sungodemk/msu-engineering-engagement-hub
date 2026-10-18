-- migrate:up

-- allows capstone rows to be tracked during merges (Aayush)
ALTER TABLE entity_merge_moves
DROP CONSTRAINT chk_entity_merge_moves_row_type,
DROP CONSTRAINT chk_entity_merge_moves_column;

ALTER TABLE entity_merge_moves
ADD CONSTRAINT chk_entity_merge_moves_row_type
    CHECK (
        row_type IN (
            'activity',
            'edge',
            'degree',
            'capstone'
        )
    ),
ADD CONSTRAINT chk_entity_merge_moves_column
    CHECK (
        (
            row_type = 'activity'
            AND changed_column IN (
                'company_entity_id',
                'person_entity_id',
                'owner_entity_id'
            )
        )
        OR
        (
            row_type = 'edge'
            AND changed_column IN (
                'from_entity_id',
                'to_entity_id'
            )
        )
        OR
        (
            row_type = 'degree'
            AND changed_column = 'person_entity_id'
        )
        OR
        (
            row_type = 'capstone'
            AND changed_column IN (
                'person_entity_id',
                'company_entity_id'
            )
        )
    );


-- migrate:down
ALTER TABLE entity_merge_moves
DROP CONSTRAINT chk_entity_merge_moves_row_type,
DROP CONSTRAINT chk_entity_merge_moves_column;

-- restores the original checks from 011 (Aayush)
ALTER TABLE entity_merge_moves
ADD CONSTRAINT chk_entity_merge_moves_row_type
    CHECK (
        row_type IN (
            'activity',
            'edge',
            'degree'
        )
    ),
ADD CONSTRAINT chk_entity_merge_moves_column
    CHECK (
        (
            row_type = 'activity'
            AND changed_column IN (
                'company_entity_id',
                'person_entity_id',
                'owner_entity_id'
            )
        )
        OR
        (
            row_type = 'edge'
            AND changed_column IN (
                'from_entity_id',
                'to_entity_id'
            )
        )
        OR
        (
            row_type = 'degree'
            AND changed_column = 'person_entity_id'
        )
    );