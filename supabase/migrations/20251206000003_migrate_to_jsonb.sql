-- 1. Migrate existing data to settings JSONB
UPDATE public.dida_master_user_config
SET settings = settings || jsonb_build_object(
  'dida_token', dida_token,
  'dida_project_id', dida_project_id,
  'exclude_project_name', exclude_project_name,
  'llm_api_key', llm_api_key,
  'llm_model', llm_model,
  'llm_api_url', llm_api_url,
  'cal_enable', cal_enable,
  'icloud_username', icloud_username,
  'icloud_app_password', icloud_app_password,
  'cal_lookahead_days', cal_lookahead_days,
  'calendar_target', calendar_target
);

-- 2. Drop the old columns
ALTER TABLE public.dida_master_user_config
DROP COLUMN IF EXISTS dida_token,
DROP COLUMN IF EXISTS dida_project_id,
DROP COLUMN IF EXISTS exclude_project_name,
DROP COLUMN IF EXISTS llm_api_key,
DROP COLUMN IF EXISTS llm_model,
DROP COLUMN IF EXISTS llm_api_url,
DROP COLUMN IF EXISTS cal_enable,
DROP COLUMN IF EXISTS icloud_username,
DROP COLUMN IF EXISTS icloud_app_password,
DROP COLUMN IF EXISTS cal_lookahead_days,
DROP COLUMN IF EXISTS calendar_target;
