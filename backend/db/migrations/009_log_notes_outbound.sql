-- Zhixiang Miao

-- migrate:up
ALTER TABLE log_activity ADD COLUMN notes TEXT;

-- migrate:down
ALTER TABLE log_activity DROP COLUMN notes;