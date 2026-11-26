-- ============================================================
-- OpenHRApp — Let employees record their own lunch break
-- 0058_allow_employee_break_edits.sql
--
-- 0056 added break_start / break_end, but the protect_attendance_workflow()
-- trigger still only allowed a regular employee to change
-- check_out / remarks / selfie / updated on their own row. Setting a break
-- therefore failed for employees with "Only check-out, remarks and the selfie
-- can be changed" (admins were unaffected, since they return early). This adds
-- break_start / break_end to that allow-list so an employee can start and end
-- their lunch break. Everything else about the trigger is unchanged.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_attendance_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller profiles%ROWTYPE;
  me text := auth.uid()::text;
  -- Check-in times are built from the device clock rounded to the minute.
  slack interval := interval '15 minutes';
  fixed text[] := ARRAY['check_out', 'remarks', 'selfie', 'updated', 'break_start', 'break_end'];
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  SELECT * INTO caller FROM profiles WHERE id = auth.uid();

  IF caller.organization_id = NEW.organization_id AND (
       caller.role IN ('ADMIN', 'HR')
       OR (TG_OP = 'UPDATE' AND caller.role = 'MANAGER' AND OLD.employee_id <> me)
     ) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.employee_id IS DISTINCT FROM me THEN
      RAISE EXCEPTION 'You can only check in for yourself';
    END IF;
    IF NEW.check_in > now() + slack OR NEW.check_in < now() - interval '7 days' OR NEW.check_out > now() + slack THEN
      RAISE EXCEPTION 'Attendance time is out of range';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.employee_id IS DISTINCT FROM me THEN
    RAISE EXCEPTION 'You can only update your own attendance';
  END IF;

  IF (to_jsonb(NEW) - fixed) <> (to_jsonb(OLD) - fixed) THEN
    RAISE EXCEPTION 'Only check-out, lunch break, remarks and the selfie can be changed';
  END IF;

  -- No "after check-in" rule: night-shift check-outs are stored against the check-in date.
  IF NEW.check_out IS DISTINCT FROM OLD.check_out AND (OLD.check_out IS NOT NULL OR NEW.check_out IS NULL OR NEW.check_out > now() + slack) THEN
    RAISE EXCEPTION 'Check-out can be set once and not in the future';
  END IF;

  IF NEW.selfie IS DISTINCT FROM OLD.selfie AND OLD.selfie IS NOT NULL THEN
    RAISE EXCEPTION 'The check-in selfie cannot be replaced';
  END IF;

  RETURN NEW;
END;
$function$;
