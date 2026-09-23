-- migrate:up
Create Table entities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL, --'person, organization, event, etc'
        CHECK (entity_type IN ('person', 'organization', 'msu_unit')),
    display_name text NOT NULL,
    normalized_name text NOT NULL,
    email text,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
      check (jsonb_typeof(attributes) = 'object'),
    merged_into_id uuid REFERENCES entities(id), 
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    check (merged_into_id IS NULL OR merged_into_id <> id),
    check (email is null or entity_type = 'person')
);

CREATE TRIGGER entities_set_updated_at BEFORE UPDATE ON entities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

create index entities_type_idx ON entities (entity_type);
create index entities_norm_name_idx ON entities (entity_type, normalized_name);
create index entities_merged_into_idx ON entities (merged_into_id);
create index entities_attributes_idx ON entities USING gin (attributes);

--which source records have been merged into an entity--
create table entity_source_records (
    entity_id uuid REFERENCES entities(id) ON DELETE CASCADE,
    source_record_id uuid REFERENCES source_records(id) ON DELETE CASCADE,
    linked_type TEXT NOT NULL default 'origin' CHECK (linked_type IN ('origin', 'mention')), 
    --origin: the source record that was merged into the entity 
    --mention: a source record that was linked to the entity but not merged
    linked_at timestamptz NOT NULL DEFAULT now(),
    primary key (entity_id, source_record_id)
);

create index esr_source_record_id_idx ON entity_source_records (source_record_id);

--live non-merged entities: for use in app queries--
create view live_entities as
select * from entities where merged_into_id is null;

-- migrate:down
drop view if exists live_entities;
drop table if exists entity_source_records;
drop table if exists entities;
