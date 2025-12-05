alter table public.dida_master_user_config
add column access_token text default encode(gen_random_bytes(16), 'hex');

-- Create a unique index to ensure quick lookup
create unique index on public.dida_master_user_config (access_token);
