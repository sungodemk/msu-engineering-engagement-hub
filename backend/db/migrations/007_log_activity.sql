-- Zhixiang Miao
-- Used this link to reference about PostgreSQL: 
-- https://www.postgresql.org/docs/

-- migrate:up
CREATE TABLE log_activity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    activity_record_type text,
    stage_name text,
    amount numeric,
    close_date date
);

CREATE INDEX idx_log_activity_company_id ON log_activity(company_id);

-- migrate:down
DROP TABLE log_activity;