-- Migration 0057: mileage log (own-car trips)
--
-- Records a work trip the employee makes in their own car. The employee snaps
-- a photo of the odometer and types the reading when they set out (start) and
-- again when they finish (end). `distance` is computed from the two readings —
-- no GPS/API involved. The boss sees every employee's trips and exports them to
-- Excel. Photos are stored inline as compressed webp data URLs (low volume,
-- avoids a separate Storage bucket + its RLS).
--
-- RLS mirrors attendance (0051): ADMIN/HR see the whole org, managers see the
-- people they manage, everyone sees their own rows.

create table if not exists public.mileage_log (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  employee_id      text not null,
  employee_name    text,
  date             date not null,
  start_reading    numeric,
  start_photo      text,
  start_at         timestamptz,
  end_reading      numeric,
  end_photo        text,
  end_at           timestamptz,
  distance         numeric generated always as (
                     case when end_reading is not null and start_reading is not null
                       then end_reading - start_reading else null end
                   ) stored,
  created_at       timestamptz not null default now()
);

create index if not exists idx_mileage_org_emp_date
  on public.mileage_log(organization_id, employee_id, date);

alter table public.mileage_log enable row level security;

drop policy if exists "mileage_select" on public.mileage_log;
create policy "mileage_select" on public.mileage_log for select using (
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

drop policy if exists "mileage_insert" on public.mileage_log;
create policy "mileage_insert" on public.mileage_log for insert with check (
  (select public.is_super_admin())
  or organization_id = (select public.auth_org_id())
);

drop policy if exists "mileage_update" on public.mileage_log;
create policy "mileage_update" on public.mileage_log for update using (
  (select public.is_super_admin())
  or (
    organization_id = (select public.auth_org_id())
    and (
      (select public.auth_role()) in ('ADMIN', 'HR', 'MANAGER')
      or employee_id = (select auth.uid())::text
    )
  )
);

drop policy if exists "mileage_delete" on public.mileage_log;
create policy "mileage_delete" on public.mileage_log for delete using (
  (select public.is_super_admin())
  or (
    organization_id = (select public.auth_org_id())
    and (select public.auth_role()) in ('ADMIN', 'HR')
  )
);

grant select, insert, update, delete on public.mileage_log to authenticated;
grant select, insert, update, delete on public.mileage_log to anon;

notify pgrst, 'reload schema';
