-- migrate:up
CREATE TABLE users(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid text NOT NULL UNIQUE,
    email text NOT NULL,
    display_name text NOT NULL,
    role text NOT NULL DEFAULT 'staff',


    -- Salesforce staff contact ID
    staff_external_id text,

    is_active boolean NOT NULL DEFAULT true,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_users_role CHECK (role IN ('admin','staff','viewer'))
);

CREATE UNIQUE INDEX uq_users_email ON users (lower(email));

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down
DROP TABLE users;


