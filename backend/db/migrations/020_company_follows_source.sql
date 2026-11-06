-- migrate:up

-- keeps company follows through reseeds by storing their source (Aayush)
ALTER TABLE company_follows
    ADD COLUMN source_system text,
    ADD COLUMN source_pk text;

UPDATE company_follows cf
SET
    source_system = sr.source_system,
    source_pk = sr.source_pk
FROM entity_source_records esr
JOIN source_records sr
    ON sr.id = esr.source_record_id
WHERE esr.entity_id = cf.company_entity_id
  AND esr.linked_type = 'origin';

ALTER TABLE company_follows
    ALTER COLUMN source_system SET NOT NULL,
    ALTER COLUMN source_pk SET NOT NULL;

ALTER TABLE company_follows
    DROP CONSTRAINT uq_company_follows_user_company;

ALTER TABLE company_follows
    DROP COLUMN company_entity_id;

ALTER TABLE company_follows
    ADD CONSTRAINT uq_company_follows_user_source
    UNIQUE (user_id, source_system, source_pk);


-- migrate:down

-- restores entity-based follows from their stored sources (Aayush)
ALTER TABLE company_follows
    ADD COLUMN company_entity_id uuid;

UPDATE company_follows cf
SET company_entity_id = esr.entity_id
FROM source_records sr
JOIN entity_source_records esr
    ON esr.source_record_id = sr.id
WHERE cf.source_system = sr.source_system
  AND cf.source_pk = sr.source_pk
  AND esr.linked_type = 'origin';

ALTER TABLE company_follows
    ALTER COLUMN company_entity_id SET NOT NULL;

ALTER TABLE company_follows
    ADD CONSTRAINT company_follows_company_entity_id_fkey
    FOREIGN KEY (company_entity_id)
    REFERENCES entities(id);

ALTER TABLE company_follows
    DROP CONSTRAINT uq_company_follows_user_source;

ALTER TABLE company_follows
    ADD CONSTRAINT uq_company_follows_user_company
    UNIQUE (user_id, company_entity_id);

ALTER TABLE company_follows
    DROP COLUMN source_system,
    DROP COLUMN source_pk;
