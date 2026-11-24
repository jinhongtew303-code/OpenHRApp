-- ============================================================
-- OpenHRApp — Punctuality rewards: claimed rewards
-- 0057_reward_claims.sql
--
-- Employees earn rewards for being on time (see src/utils/punctuality.ts):
--   STREAK  — every N consecutive on-time days (period = date it was reached)
--   MONTHLY — a perfect month (period = YYYY-MM)
-- Progress is computed on the client from attendance. This table only records
-- which reward the employee picked, and whether the boss has handed it over.
--
-- The reward settings live in public.settings under key 'punctuality_rewards'.
-- Apply by hand in the SQL Editor on every database the app may run on.
-- ============================================================

create table if not exists public.reward_claims (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id     text not null,
  employee_name   text,
  kind            text not null check (kind in ('STREAK', 'MONTHLY')),
  period          text not null,
  reward          text not null,
  status          text not null default 'PENDING' check (status in ('PENDING', 'GIVEN')),
  created_at      timestamptz not null default now(),
  given_at        timestamptz,
  given_by        text,
  unique (employee_id, kind, period)
);

create index if not exists reward_claims_org_idx on public.reward_claims (organization_id, created_at desc);

alter table public.reward_claims enable row level security;

drop policy if exists "reward_claims_select" on public.reward_claims;
create policy "reward_claims_select" on public.reward_claims for select using (
  public.is_super_admin()
  or (organization_id = public.auth_org_id()
      and (employee_id = auth.uid()::text or public.auth_role() in ('ADMIN', 'HR', 'MANAGER')))
);

-- Employees claim only for themselves, only into their own org, only as PENDING.
drop policy if exists "reward_claims_insert" on public.reward_claims;
create policy "reward_claims_insert" on public.reward_claims for insert with check (
  organization_id = public.auth_org_id()
  and employee_id = auth.uid()::text
  and status = 'PENDING'
  and given_at is null
  and given_by is null
);

-- Only the boss (ADMIN/HR) marks a reward as given.
drop policy if exists "reward_claims_update" on public.reward_claims;
create policy "reward_claims_update" on public.reward_claims for update using (
  public.is_super_admin()
  or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN', 'HR'))
);

drop policy if exists "reward_claims_delete" on public.reward_claims;
create policy "reward_claims_delete" on public.reward_claims for delete using (
  public.is_super_admin()
  or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN', 'HR'))
);
