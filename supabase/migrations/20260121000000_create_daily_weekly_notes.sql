create table public.dida_master_daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  dida_task_id text,
  dida_project_id text,
  note_date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.dida_master_daily_notes (user_id, note_date);

alter table public.dida_master_daily_notes enable row level security;

create policy "Users can view their own daily notes"
  on public.dida_master_daily_notes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own daily notes"
  on public.dida_master_daily_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own daily notes"
  on public.dida_master_daily_notes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own daily notes"
  on public.dida_master_daily_notes for delete
  using (auth.uid() = user_id);

create table public.dida_master_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  dida_task_id text,
  dida_project_id text,
  period_start date not null,
  period_end date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.dida_master_weekly_reports (user_id, period_start);

alter table public.dida_master_weekly_reports enable row level security;

create policy "Users can view their own weekly reports"
  on public.dida_master_weekly_reports for select
  using (auth.uid() = user_id);

create policy "Users can insert their own weekly reports"
  on public.dida_master_weekly_reports for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own weekly reports"
  on public.dida_master_weekly_reports for update
  using (auth.uid() = user_id);

create policy "Users can delete their own weekly reports"
  on public.dida_master_weekly_reports for delete
  using (auth.uid() = user_id);
