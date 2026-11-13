-- migrate:up

-- stores job changes by source so they survive reseeds (Aayush)
CREATE TABLE edge_edits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system text NOT NULL,
    source_pk text NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    edited_by uuid REFERENCES users(id) ON DELETE SET NULL,
    edited_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_edge_edits_field
        CHECK (field_name IN ('edge_role', 'valid_from', 'valid_to'))
);

CREATE INDEX idx_edge_edits_source
    ON edge_edits (
        source_system,
        source_pk,
        field_name,
        edited_at DESC
    );


-- migrate:down
DROP TABLE edge_edits;