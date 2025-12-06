alter table public.dida_master_user_config
add column if not exists settings jsonb default '{}'::jsonb;
