-- ============================================================
-- Clubs et membres de club (phase 1 du plan "Clubs & Visibilité").
--
-- Purement additif : rien de ce qui existe (tournament_admins,
-- event_admins, les policies actuelles) n'est modifié. Un tournoi ou
-- un évènement sans club continue de fonctionner exactement comme
-- avant. La colonne "visibility" est ajoutée mais la policy de
-- lecture n'est PAS encore resserrée — ça viendra dans une migration
-- séparée, une fois les données existantes vérifiées.
-- ============================================================
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  logo_url text,
  location text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

create policy "Tout le monde peut voir les clubs"
  on public.clubs for select
  to authenticated
  using (true);

create policy "Un utilisateur connecté peut créer un club"
  on public.clubs for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Le propriétaire peut supprimer le club"
  on public.clubs for delete
  to authenticated
  using (created_by = auth.uid());

-- ============================================================
-- Membres du club : owner (fondateur ou successeur), admin (gère
-- tournois/évènements et membres), treasurer (rôle allégé côté
-- argent, prépare une future gestion de trésorerie), member (accès
-- simple au contenu réservé au club).
-- ============================================================
create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'treasurer', 'member')),
  added_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (club_id, user_id)
);

alter table public.club_members enable row level security;

-- Une policy de club_members qui interroge club_members directement
-- provoque une récursion infinie côté Postgres ("infinite recursion
-- detected in policy"). On passe donc par des fonctions security
-- definer : elles s'exécutent avec les droits de leur propriétaire,
-- qui n'est pas soumis aux policies RLS de la table qu'elles
-- interrogent, ce qui casse le cycle.
create or replace function public.is_club_member(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_user_id
  );
$$;

create or replace function public.is_club_manager(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_user_id and role in ('owner', 'admin')
  );
$$;

create policy "Les membres d'un club se voient entre eux"
  on public.club_members for select
  to authenticated
  using (public.is_club_member(club_id, auth.uid()));

create policy "Le propriétaire ou un admin peut ajouter un membre"
  on public.club_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.clubs c
      where c.id = club_id and c.created_by = auth.uid()
    )
    or public.is_club_manager(club_id, auth.uid())
  );

create policy "Le propriétaire ou un admin peut changer un rôle"
  on public.club_members for update
  to authenticated
  using (
    exists (
      select 1 from public.clubs c
      where c.id = club_id and c.created_by = auth.uid()
    )
    or public.is_club_manager(club_id, auth.uid())
  );

create policy "Le propriétaire, un admin ou le membre lui-même peut retirer un membre"
  on public.club_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.clubs c
      where c.id = club_id and c.created_by = auth.uid()
    )
    or public.is_club_manager(club_id, auth.uid())
  );

-- Le fondateur d'un club en devient automatiquement membre avec le
-- rôle "owner" (même logique que handle_new_user() pour les profils).
create or replace function public.handle_new_club()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.club_members (club_id, user_id, role, added_by)
  values (new.id, new.created_by, 'owner', new.created_by);
  return new;
end;
$$;

drop trigger if exists on_club_created on public.clubs;
create trigger on_club_created
  after insert on public.clubs
  for each row execute function public.handle_new_club();

-- ============================================================
-- Rattachement optionnel d'un tournoi/évènement à un club, et champ
-- de visibilité. "club" n'a de sens que si club_id est renseigné.
-- ============================================================
alter table public.tournaments
  add column if not exists club_id uuid references public.clubs (id) on delete set null,
  add column if not exists visibility text not null default 'private'
    check (visibility in ('public', 'club', 'private'));

alter table public.tournaments
  drop constraint if exists tournaments_club_visibility_check,
  add constraint tournaments_club_visibility_check
    check (visibility <> 'club' or club_id is not null);

alter table public.events
  add column if not exists club_id uuid references public.clubs (id) on delete set null,
  add column if not exists visibility text not null default 'private'
    check (visibility in ('public', 'club', 'private'));

alter table public.events
  drop constraint if exists events_club_visibility_check,
  add constraint events_club_visibility_check
    check (visibility <> 'club' or club_id is not null);

-- ============================================================
-- Corrige un point découvert en supprimant un compte de test : ces
-- colonnes ne servent qu'à l'audit ("qui a fait cette action"), elles
-- ne doivent jamais empêcher de supprimer le compte concerné.
-- ============================================================
alter table public.tournament_admins
  drop constraint if exists tournament_admins_added_by_fkey,
  add constraint tournament_admins_added_by_fkey
    foreign key (added_by) references public.profiles (id) on delete set null;

alter table public.event_admins
  drop constraint if exists event_admins_added_by_fkey,
  add constraint event_admins_added_by_fkey
    foreign key (added_by) references public.profiles (id) on delete set null;

alter table public.tournament_invitations
  drop constraint if exists tournament_invitations_invited_by_fkey,
  add constraint tournament_invitations_invited_by_fkey
    foreign key (invited_by) references public.profiles (id) on delete set null;

alter table public.tournament_players
  drop constraint if exists tournament_players_eliminated_by_fkey,
  add constraint tournament_players_eliminated_by_fkey
    foreign key (eliminated_by) references public.profiles (id) on delete set null;
