-- migrate:up

-- keeps field edits across reseeds without depending on entity IDs (Aayush)
CREATE TABLE entity_edits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system text NOT NULL,
    source_pk text NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    edited_by uuid REFERENCES users(id) ON DELETE SET NULL,
    edited_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_entity_edits_field
        CHECK (
            field_name IN (
                'display_name',
                'email',
                'industry',
                'industry_detail',
                'city',
                'state'
            )
        )
);

CREATE INDEX idx_entity_edits_source
    ON entity_edits (source_system, source_pk, field_name, edited_at DESC);


-- migrate:down
DROP TABLE entity_edits;