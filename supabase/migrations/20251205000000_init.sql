create table public.dida_master_user_config (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  dida_token text,
  dida_project_id text,
  exclude_project_name text,
  llm_api_key text,
  llm_model text,
  llm_api_url text,
  cal_enable boolean default false,
  icloud_username text,
  icloud_app_password text,
  cal_lookahead_days integer default 2,
  calendar_target text,
  updated_at timestamptz default now()
);

alter table public.dida_master_user_config enable row level security;

create policy "Users can view their own config"
  on public.dida_master_user_config for select
  using (auth.uid() = user_id);

create policy "Users can insert their own config"
  on public.dida_master_user_config for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own config"
  on public.dida_master_user_config for update
  using (auth.uid() = user_id);
