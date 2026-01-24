create table public.dida_master_calendar_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  base_event jsonb not null default '{}'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_used_at timestamptz
);

create index on public.dida_master_calendar_templates (user_id);

alter table public.dida_master_calendar_templates enable row level security;

create policy "Users can view their own calendar templates"
  on public.dida_master_calendar_templates for select
  using (auth.uid() = user_id);

create policy "Users can insert their own calendar templates"
  on public.dida_master_calendar_templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own calendar templates"
  on public.dida_master_calendar_templates for update
  using (auth.uid() = user_id);

create policy "Users can delete their own calendar templates"
  on public.dida_master_calendar_templates for delete
  using (auth.uid() = user_id);
