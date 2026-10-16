-- migrate:up

-- records rows moved during a merge so they can be restored later (Aayush)
CREATE TABLE entity_merge_moves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- no foreign key so matcher reruns can replace machine matches without losing merge history
    match_id uuid NOT NULL,

    row_type text NOT NULL,

    -- can refer to an activity, edge or degree
    row_id uuid NOT NULL,

    changed_column text NOT NULL,

    old_entity_id uuid NOT NULL REFERENCES entities(id),
    new_entity_id uuid NOT NULL REFERENCES entities(id),

    -- preserves the order changes were made
    move_order bigserial,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_entity_merge_moves_row_type
        CHECK (
            row_type IN (
                'activity',
                'edge',
                'degree'
            )
        ),

    CONSTRAINT chk_entity_merge_moves_column
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
        ),

    CONSTRAINT chk_entity_merge_moves_entities
        CHECK (
            old_entity_id <> new_entity_id
        )
);

-- keeps undo lookups in merge order
CREATE INDEX idx_entity_merge_moves_match_order
    ON entity_merge_moves (
        match_id,
        move_order
    );


-- migrate:down
DROP TABLE entity_merge_moves;