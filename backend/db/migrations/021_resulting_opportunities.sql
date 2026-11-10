-- migrate:up
ALTER TABLE activities
    ADD COLUMN resulting_id uuid REFERENCES activities(id);
ALTER TABLE activities
    ADD CONSTRAINT chk_activities_resulting_id
        CHECK (
            resulting_id IS NULL OR
            resulting_id <> id
        );

-- migrate:down
ALTER TABLE activities DROP CONSTRAINT chk_activities_resulting_id;
ALTER TABLE activities DROP COLUMN resulting_id;