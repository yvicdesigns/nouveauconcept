-- ================================================================
-- Module Sondages — Migration Supabase
-- Copiez ce SQL dans l'éditeur SQL de votre projet Supabase
-- ================================================================

-- 1. Table des sondages
create table if not exists public.surveys (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  slug        text unique not null,
  is_active   boolean default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. Table des questions
create table if not exists public.survey_questions (
  id            uuid primary key default gen_random_uuid(),
  survey_id     uuid references public.surveys(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'text',  -- 'text' | 'rating' | 'yesno' | 'choice'
  options       jsonb default '[]',             -- pour le type 'choice'
  "order"       integer default 0,
  required      boolean default false,
  created_at    timestamptz default now()
);

-- 3. Table des réponses (une ligne par participant)
create table if not exists public.survey_responses (
  id               uuid primary key default gen_random_uuid(),
  survey_id        uuid references public.surveys(id) on delete cascade,
  respondent_name  text,
  respondent_phone text,
  is_anonymous     boolean default false,
  anonymous_id     text,
  submitted_at     timestamptz default now()
);

-- 4. Table des réponses détaillées (une ligne par question répondue)
create table if not exists public.survey_answers (
  id           uuid primary key default gen_random_uuid(),
  response_id  uuid references public.survey_responses(id) on delete cascade,
  question_id  uuid references public.survey_questions(id) on delete cascade,
  answer_text  text,
  answer_value integer,
  created_at   timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.surveys          enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_answers   enable row level security;

-- Surveys : tout le monde peut lire les sondages actifs ; les authentifiés gèrent tout
create policy "Public lit les sondages actifs"
  on public.surveys for select using (is_active = true);

create policy "Authentifié gère les sondages"
  on public.surveys for all using (auth.role() = 'authenticated');

-- Questions : même logique
create policy "Public lit les questions des sondages actifs"
  on public.survey_questions for select using (
    exists (select 1 from public.surveys s where s.id = survey_id and s.is_active = true)
  );

create policy "Authentifié gère les questions"
  on public.survey_questions for all using (auth.role() = 'authenticated');

-- Réponses : n'importe qui peut soumettre ; seuls les authentifiés peuvent lire/supprimer
create policy "N'importe qui peut soumettre une réponse"
  on public.survey_responses for insert with check (true);

create policy "Authentifié lit les réponses"
  on public.survey_responses for select using (auth.role() = 'authenticated');

create policy "Authentifié supprime les réponses"
  on public.survey_responses for delete using (auth.role() = 'authenticated');

-- Réponses détaillées : idem
create policy "N'importe qui peut soumettre une réponse détaillée"
  on public.survey_answers for insert with check (true);

create policy "Authentifié lit les réponses détaillées"
  on public.survey_answers for select using (auth.role() = 'authenticated');

create policy "Authentifié supprime les réponses détaillées"
  on public.survey_answers for delete using (auth.role() = 'authenticated');
