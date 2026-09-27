-- migrate:up

CREATE TABLE degrees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    degree_type text,
    major text,
    college text,
    class_year integer,
    source_record_id uuid NOT NULL REFERENCES source_records(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_degrees_person ON degrees (person_entity_id);

-- staff assigned to manage company or person 
ALTER TABLE edges DROP CONSTRAINT chk_edge_type;
ALTER TABLE edges ADD CONSTRAINT chk_edge_type
    CHECK (edge_type IN ('employed_by', 'relationship_owner'));



-- migrate:down
DELETE FROM edges WHERE edge_type = 'relationship_owner';
ALTER TABLE edges DROP CONSTRAINT chk_edge_type;
ALTER TABLE edges ADD CONSTRAINT chk_edge_type
    CHECK(edge_typeIN ('employed_by'));
DROP TABLE degrees;
