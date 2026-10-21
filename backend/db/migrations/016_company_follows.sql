-- migrate:up

-- keeps the original followed company even when entities merge (Aayush)
CREATE TABLE company_follows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_entity_id uuid NOT NULL REFERENCES entities(id),
    followed_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_company_follows_user_company
        UNIQUE (user_id, company_entity_id)
);

-- migrate:down
DROP TABLE company_follows;