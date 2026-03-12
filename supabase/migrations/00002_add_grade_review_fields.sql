-- Add teacher review fields to grades table
alter table public.grades add column if not exists reviewed boolean not null default false;
alter table public.grades add column if not exists teacher_notes text;
alter table public.grades add column if not exists original_score numeric;
alter table public.grades add column if not exists original_letter_grade text;
