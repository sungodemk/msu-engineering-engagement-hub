Create Table source_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system text NOT NULL, --'Salesforce, Kuali, handshake'
    source_table text NOT NULL, --'The table name in the source system'
    source_pk text NOT NULL, --'The primary key of the record in the source system'
    record_data JSONB NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_system, source_table, source_pk)
);