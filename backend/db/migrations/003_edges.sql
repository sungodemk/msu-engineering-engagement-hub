-- migrate:up
CREATE TABLE edges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id uuid NOT NULL REFERENCES entities(id),
    to_entity_id uuid NOT NULL REFERENCES entities(id),
    edge_type text NOT NULL,
    edge_role text,

    valid_from date NOT NULL,
    valid_to date, -- null means still valid

    source_record_id uuid NOT NULL REFERENCES source_records(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_edges_entities
        CHECK (from_entity_id <> to_entity_id),

    CONSTRAINT chk_date_range
        CHECK (valid_to IS NULL OR valid_to > valid_from),

    CONSTRAINT chk_edge_type
        CHECK (edge_type IN ('employed_by', 'partner_of', 'part_of', 'works_with', 'relationship_owner'))

);

CREATE TRIGGER edges_set_up BEFORE UPDATE ON edges
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_edges_from ON edges (from_entity_id);
CREATE INDEX idx_edges_to ON edges (to_entity_id);

-- temporal graph needs to be able to query edges by date range
CREATE INDEX idx_edges_valid ON edges (valid_from, valid_to);

-- migrate:down
DROP TABLE edges;