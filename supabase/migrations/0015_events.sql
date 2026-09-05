-- Un évènement regroupe un ou plusieurs tournois (ex: "ZGONS Poker
-- Open 2026" contient un satellite qualificatif et le main event).
-- Un tournoi peut toujours exister seul (event_id nul) : aucune
-- rupture avec l'existant.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  logo_url text,
  location text,
  scheduled_at timestamptz,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

drop policy if exists "Tout le monde peut voir les évènements" on public.events;
create policy "Tout le monde peut voir les évènements"
  on public.events for select
  to authenticated
  using (true);

drop policy if exists "Un utilisateur connecté peut créer un évènement" on public.events;
create policy "Un utilisateur connecté peut créer un évènement"
  on public.events for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Seul l'organisateur peut supprimer l'évènement" on public.events;
create policy "Seul l'organisateur peut supprimer l'évènement"
  on public.events for delete
  to authenticated
  using (created_by = auth.uid());

-- ============================================================
-- Co-administrateurs d'un évènement (mêmes droits que
-- l'organisateur, sauf gérer la liste des administrateurs).
-- Doit être créée avant la policy UPDATE de "events" ci-dessous,
-- qui référence cette table.
-- ============================================================
create table if not exists public.event_admins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_admins enable row level security;

drop policy if exists "Tout le monde peut voir les administrateurs d'un évènement" on public.event_admins;
create policy "Tout le monde peut voir les administrateurs d'un évènement"
  on public.event_admins for select
  to authenticated
  using (true);

drop policy if exists "Seul l'organisateur peut nommer des co-administrateurs d'évènement" on public.event_admins;
create policy "Seul l'organisateur peut nommer des co-administrateurs d'évènement"
  on public.event_admins for insert
  to authenticated
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_admins.event_id and e.created_by = auth.uid()
    )
  );

drop policy if exists "Seul l'organisateur peut retirer un co-administrateur d'évènement" on public.event_admins;
create policy "Seul l'organisateur peut retirer un co-administrateur d'évènement"
  on public.event_admins for delete
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_admins.event_id and e.created_by = auth.uid()
    )
  );

drop policy if exists "L'organisateur ou un co-administrateur peut modifier l'évènement" on public.events;
create policy "L'organisateur ou un co-administrateur peut modifier l'évènement"
  on public.events for update
  to authenticated
  using (
    events.created_by = auth.uid()
    or exists (
      select 1 from public.event_admins ea
      where ea.event_id = events.id and ea.user_id = auth.uid()
    )
  );

-- ============================================================
-- Rattachement (optionnel) d'un tournoi à un évènement.
-- ============================================================
alter table public.tournaments
  add column if not exists event_id uuid references public.events (id) on delete set null;

drop policy if exists "Un utilisateur connecté peut créer un tournoi" on public.tournaments;
create policy "Un utilisateur connecté peut créer un tournoi"
  on public.tournaments for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      tournaments.event_id is null
      or exists (
        select 1 from public.events e
        where e.id = tournaments.event_id and e.created_by = auth.uid()
      )
      or exists (
        select 1 from public.event_admins ea
        where ea.event_id = tournaments.event_id and ea.user_id = auth.uid()
      )
    )
  );

-- Bucket de stockage public pour les logos d'évènement.
insert into storage.buckets (id, name, public)
values ('event-logos', 'event-logos', true)
on conflict (id) do nothing;

drop policy if exists "Les logos d'évènement sont visibles par tous" on storage.objects;
create policy "Les logos d'évènement sont visibles par tous"
  on storage.objects for select
  using (bucket_id = 'event-logos');

drop policy if exists "Un utilisateur peut uploader son propre logo d'évènement" on storage.objects;
create policy "Un utilisateur peut uploader son propre logo d'évènement"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Un utilisateur peut modifier son propre logo d'évènement" on storage.objects;
create policy "Un utilisateur peut modifier son propre logo d'évènement"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Un utilisateur peut supprimer son propre logo d'évènement" on storage.objects;
create policy "Un utilisateur peut supprimer son propre logo d'évènement"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
