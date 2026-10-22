-- migrate:up
CREATE TABLE person_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system text NOT NULL,
    source_pk text NOT NULL,
    note_date date NOT NULL DEFAULT CURRENT_DATE,
    title text NOT NULL,
    body text NOT NULL DEFAULT '',
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_person_notes_source ON person_notes (source_system, source_pk);
CREATE TRIGGER person_notes_set_updated_at BEFORE UPDATE ON person_notes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down
DROP TABLE person_notes;
