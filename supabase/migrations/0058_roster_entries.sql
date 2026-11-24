-- ============================================================
-- OpenHRApp — Weekly roster (per-person, per-day start/end time)
-- 0058_roster_entries.sql
--
-- For shops where everyone starts at a different time every day. One row per
-- employee per date: a start/end time, or a day off. Check-in late detection
-- uses the roster entry for that day first, then the employee's assigned shift,
-- then the default shift, then the company office hours.
--
-- Bosses, HR and managers edit the roster; everyone in the organization can
-- read it (staff see the week's schedule). The grace period still comes from
-- the employee's shift / company settings.
--
-- Apply by hand in the SQL Editor. The app treats a missing table as "no
-- roster", so databases without it keep working unchanged.
-- ============================================================

create table if not exists public.roster_entries (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id     text not null,
  date            date not null,
  start_time      text,          -- 'HH:MM', null when is_off
  end_time        text,          -- 'HH:MM', optional
  is_off          boolean not null default false,
  updated_at      timestamptz not null default now(),
  updated_by      text,
  unique (employee_id, date),
  check (is_off or start_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  check (end_time is null or end_time ~ '^[0-2][0-9]:[0-5][0-9]$')
);

create index if not exists roster_entries_org_date_idx on public.roster_entries (organization_id, date);

alter table public.roster_entries enable row level security;

drop policy if exists "roster_select" on public.roster_entries;
create policy "roster_select" on public.roster_entries for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);

drop policy if exists "roster_insert" on public.roster_entries;
create policy "roster_insert" on public.roster_entries for insert with check (
  public.is_super_admin()
  or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN', 'HR', 'MANAGER'))
);

drop policy if exists "roster_update" on public.roster_entries;
create policy "roster_update" on public.roster_entries for update using (
  public.is_super_admin()
  or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN', 'HR', 'MANAGER'))
);

drop policy if exists "roster_delete" on public.roster_entries;
create policy "roster_delete" on public.roster_entries for delete using (
  public.is_super_admin()
  or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN', 'HR', 'MANAGER'))
);
