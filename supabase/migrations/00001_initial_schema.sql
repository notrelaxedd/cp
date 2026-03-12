-- ============================================================
-- Initial Schema Migration
-- Tables: profiles, rubrics, assignments, papers, grades
-- Includes RLS policies and profile creation trigger
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- 2. RUBRICS
-- ============================================================
create table public.rubrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  criteria jsonb not null default '[]'::jsonb,
  max_score numeric not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rubrics enable row level security;

create policy "Users can view their own rubrics"
  on public.rubrics for select
  using (auth.uid() = user_id);

create policy "Users can create their own rubrics"
  on public.rubrics for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own rubrics"
  on public.rubrics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own rubrics"
  on public.rubrics for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 3. ASSIGNMENTS
-- ============================================================
create table public.assignments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rubric_id uuid references public.rubrics(id) on delete set null,
  title text not null,
  description text,
  subject text,
  grade_level text,
  due_date timestamptz,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assignments enable row level security;

create policy "Users can view their own assignments"
  on public.assignments for select
  using (auth.uid() = user_id);

create policy "Users can create their own assignments"
  on public.assignments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own assignments"
  on public.assignments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own assignments"
  on public.assignments for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 4. PAPERS
-- ============================================================
create table public.papers (
  id uuid default uuid_generate_v4() primary key,
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  student_name text not null,
  file_url text,
  file_name text,
  file_type text,
  extracted_text text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'graded', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.papers enable row level security;

create policy "Users can view their own papers"
  on public.papers for select
  using (auth.uid() = user_id);

create policy "Users can create their own papers"
  on public.papers for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own papers"
  on public.papers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own papers"
  on public.papers for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 5. GRADES
-- ============================================================
create table public.grades (
  id uuid default uuid_generate_v4() primary key,
  paper_id uuid references public.papers(id) on delete cascade not null,
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  score numeric not null,
  max_score numeric not null default 100,
  letter_grade text,
  feedback text,
  criteria_scores jsonb not null default '[]'::jsonb,
  ai_model text,
  graded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.grades enable row level security;

create policy "Users can view their own grades"
  on public.grades for select
  using (auth.uid() = user_id);

create policy "Users can create their own grades"
  on public.grades for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own grades"
  on public.grades for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own grades"
  on public.grades for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 6. INDEXES
-- ============================================================
create index idx_rubrics_user_id on public.rubrics(user_id);
create index idx_assignments_user_id on public.assignments(user_id);
create index idx_assignments_rubric_id on public.assignments(rubric_id);
create index idx_papers_assignment_id on public.papers(assignment_id);
create index idx_papers_user_id on public.papers(user_id);
create index idx_grades_paper_id on public.grades(paper_id);
create index idx_grades_assignment_id on public.grades(assignment_id);
create index idx_grades_user_id on public.grades(user_id);

-- ============================================================
-- 7. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_rubrics_updated_at
  before update on public.rubrics
  for each row execute function public.handle_updated_at();

create trigger set_assignments_updated_at
  before update on public.assignments
  for each row execute function public.handle_updated_at();

create trigger set_papers_updated_at
  before update on public.papers
  for each row execute function public.handle_updated_at();

create trigger set_grades_updated_at
  before update on public.grades
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 8. PROFILE CREATION TRIGGER
-- Automatically creates a profile row when a new user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
