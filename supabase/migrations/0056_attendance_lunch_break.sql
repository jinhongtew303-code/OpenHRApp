-- ============================================================
-- OpenHRApp — Lunch break timestamps on attendance
-- 0056_attendance_lunch_break.sql
--
-- Adds optional break_start / break_end to the daily attendance row so an
-- employee can record going out for lunch and coming back. Overtime is derived
-- on the client from check-in/out and the org's office hours; no column needed.
-- ============================================================

alter table public.attendance
  add column if not exists break_start timestamptz,
  add column if not exists break_end   timestamptz;
