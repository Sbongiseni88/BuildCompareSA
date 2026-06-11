-- CIDB grading preset on user profiles (M2, tender-pivot roadmap).
--
-- Stores the contractor's cidb grading designation (e.g. '4GB', '7CE') so
-- the Price Search engine can flag BoQs whose value exceeds the grade's
-- tender limit. Written only by the profile owner via the existing
-- profiles RLS policies; no new policies required.
--
-- Run in the Supabase SQL editor (idempotent).

alter table public.profiles
  add column if not exists cidb_grading text;

comment on column public.profiles.cidb_grading is
  'CIDB grading designation, e.g. 4GB / 7CE. Parsed by src/lib/cidb.ts; null = not set.';

-- Defensive check: keep the format sane (grade 1-9 + 2-letter class).
alter table public.profiles
  drop constraint if exists profiles_cidb_grading_format;
alter table public.profiles
  add constraint profiles_cidb_grading_format
  check (cidb_grading is null or cidb_grading ~ '^[1-9][A-Z]{2}$');
