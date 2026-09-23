-- migrate:up
Create Table source_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system text NOT NULL, --'Salesforce, Kuali, handshake'
        CHECK (source_system IN ('salesforce', 'kuali', 'handshake')),
    source_table text NOT NULL, --'The table name in the source system'
    source_pk text NOT NULL, --'The primary key of the record in the source system'
    payload JSONB NOT NULL,
    ingested_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_system, source_table, source_pk)
);

create trigger source_records_set_updated_at BEFORE UPDATE ON source_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();



-- migrate:down
drop function if exists source_records;
