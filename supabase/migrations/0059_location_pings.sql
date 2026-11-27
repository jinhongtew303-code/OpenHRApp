-- Migration 0059: location pings (30-minute position updates while on duty)
--
-- After an employee checks in, the app records their GPS position every
-- 30 minutes for as long as the app is open (web apps cannot read location in
-- the background). The boss's team map uses these to show each person's latest
-- position and today's route. Pings stop once the employee checks out.
--
-- RLS mirrors mileage_log (0057): ADMIN/HR see the whole org, managers see the
-- people they manage, everyone sees their own rows. Employees may only insert
-- pings for themselves; nobody updates them; only ADMIN/HR delete.

create table if not exists public.location_pings (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  employee_id      text not null,
  attendance_id    uuid,
  lat              double precision not null,
  lng              double precision not null,
  accuracy         double precision,
  created_at       timestamptz not null default now()
);

create index if not exists idx_location_pings_org_created
  on public.location_pings(organization_id, created_at);
create index if not exists idx_location_pings_emp_created
  on public.location_pings(employee_id, created_at);

alter table public.location_pings enable row level security;

drop policy if exists "location_pings_select" on public.location_pings;
create policy "location_pings_select" on public.location_pings for select using (
  (select public.is_super_admin())
  or (
    organization_id = (select public.auth_org_id())
    and (
      (select public.auth_role()) in ('ADMIN', 'HR')
      or employee_id = (select auth.uid())::text
      or public.manages_employee(employee_id)
    )
  )
);

drop policy if exists "location_pings_insert" on public.location_pings;
create policy "location_pings_insert" on public.location_pings for insert with check (
  (select public.is_super_admin())
  or (
    organization_id = (select public.auth_org_id())
    and employee_id = (select auth.uid())::text
  )
);

drop policy if exists "location_pings_delete" on public.location_pings;
create policy "location_pings_delete" on public.location_pings for delete using (
  (select public.is_super_admin())
  or (
    organization_id = (select public.auth_org_id())
    and (select public.auth_role()) in ('ADMIN', 'HR')
  )
);

grant select, insert, delete on public.location_pings to authenticated;

notify pgrst, 'reload schema';
