--migrate:up
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$ 
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- migrate:down
drop function if exists set_updated_at();
