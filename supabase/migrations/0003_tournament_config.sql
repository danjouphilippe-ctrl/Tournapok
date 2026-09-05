-- ============================================================
-- Bibliothèque de structures de blindes, réutilisables et notées
-- ============================================================
create table if not exists public.blind_structures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  speed_preset text not null default 'personnalise'
    check (speed_preset in ('standard', 'turbo', 'hyperturbo', 'deepstack', 'personnalise')),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.blind_structures enable row level security;

create policy "Tout le monde peut voir les structures"
  on public.blind_structures for select
  to authenticated
  using (true);

create policy "Un utilisateur peut créer une structure"
  on public.blind_structures for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Le créateur peut modifier sa structure"
  on public.blind_structures for update
  to authenticated
  using (created_by = auth.uid());

create policy "Le créateur peut supprimer sa structure"
  on public.blind_structures for delete
  to authenticated
  using (created_by = auth.uid());

create table if not exists public.blind_structure_levels (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.blind_structures (id) on delete cascade,
  level_number integer not null,
  is_break boolean not null default false,
  small_blind integer not null default 0,
  big_blind integer not null default 0,
  ante integer not null default 0,
  duration_minutes integer not null default 20,
  unique (structure_id, level_number)
);

alter table public.blind_structure_levels enable row level security;

create policy "Tout le monde peut voir les niveaux"
  on public.blind_structure_levels for select
  to authenticated
  using (true);

create policy "Le créateur peut ajouter des niveaux à sa structure"
  on public.blind_structure_levels for insert
  to authenticated
  with check (
    exists (
      select 1 from public.blind_structures s
      where s.id = structure_id and s.created_by = auth.uid()
    )
  );

create policy "Le créateur peut supprimer les niveaux de sa structure"
  on public.blind_structure_levels for delete
  to authenticated
  using (
    exists (
      select 1 from public.blind_structures s
      where s.id = structure_id and s.created_by = auth.uid()
    )
  );

create table if not exists public.blind_structure_ratings (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.blind_structures (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (structure_id, user_id)
);

alter table public.blind_structure_ratings enable row level security;

create policy "Tout le monde peut voir les notes"
  on public.blind_structure_ratings for select
  to authenticated
  using (true);

create policy "Un utilisateur peut noter"
  on public.blind_structure_ratings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Un utilisateur peut changer sa note"
  on public.blind_structure_ratings for update
  to authenticated
  using (user_id = auth.uid());

create policy "Un utilisateur peut retirer sa note"
  on public.blind_structure_ratings for delete
  to authenticated
  using (user_id = auth.uid());

create or replace view public.blind_structure_stats
with (security_invoker = true) as
select
  structure_id,
  round(avg(rating)::numeric, 1) as avg_rating,
  count(*) as ratings_count
from public.blind_structure_ratings
group by structure_id;

-- ============================================================
-- Nouvelles options de configuration sur les tournois
-- ============================================================
alter table public.tournaments
  add column if not exists description text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists location text,
  add column if not exists min_players integer not null default 2,
  add column if not exists max_players integer,
  add column if not exists table_size integer not null default 9,
  add column if not exists rebuy_enabled boolean not null default false,
  add column if not exists rebuy_max_per_player integer,
  add column if not exists rebuy_price numeric,
  add column if not exists rebuy_chips integer,
  add column if not exists rebuy_stack_threshold integer,
  add column if not exists rebuy_until_level integer,
  add column if not exists addon_enabled boolean not null default false,
  add column if not exists addon_price numeric,
  add column if not exists addon_chips integer,
  add column if not exists addon_at_level integer,
  add column if not exists bounty_enabled boolean not null default false,
  add column if not exists bounty_amount numeric,
  add column if not exists bounty_progressive boolean not null default false,
  add column if not exists late_registration_enabled boolean not null default false,
  add column if not exists late_registration_until_level integer,
  add column if not exists guarantee_amount numeric,
  add column if not exists payout_places integer,
  add column if not exists blind_structure_id uuid references public.blind_structures (id),
  add column if not exists current_level integer not null default 1;

-- ============================================================
-- Co-administrateurs d'un tournoi (mêmes droits de gestion que
-- l'organisateur, sauf gérer la liste des administrateurs).
-- ============================================================
create table if not exists public.tournament_admins (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

alter table public.tournament_admins enable row level security;

create policy "Tout le monde peut voir les administrateurs d'un tournoi"
  on public.tournament_admins for select
  to authenticated
  using (true);

create policy "Seul l'organisateur peut nommer des co-administrateurs"
  on public.tournament_admins for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.created_by = auth.uid()
    )
  );

create policy "Seul l'organisateur peut retirer un co-administrateur"
  on public.tournament_admins for delete
  to authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.created_by = auth.uid()
    )
  );

-- Les co-administrateurs ont les mêmes droits que l'organisateur
-- pour gérer le tournoi (démarrer, changer de niveau, etc.)
drop policy if exists "Seul l'organisateur peut modifier son tournoi" on public.tournaments;
create policy "L'organisateur ou un co-administrateur peut modifier le tournoi"
  on public.tournaments for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournaments.id and a.user_id = auth.uid()
    )
  );

-- ... et pour gérer les joueurs (éliminer, recave, add-on).
drop policy if exists "Seul l'organisateur peut mettre à jour les joueurs de son tournoi" on public.tournament_players;
create policy "L'organisateur ou un co-administrateur peut gérer les joueurs"
  on public.tournament_players for update
  to authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_players.tournament_id and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournament_players.tournament_id and a.user_id = auth.uid()
    )
  );

-- ============================================================
-- Structure de blindes propre à chaque tournoi (copie figée
-- de la structure choisie, pour ne pas dépendre d'une future
-- modification de la structure partagée).
-- ============================================================
create table if not exists public.tournament_blind_levels (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  level_number integer not null,
  is_break boolean not null default false,
  small_blind integer not null default 0,
  big_blind integer not null default 0,
  ante integer not null default 0,
  duration_minutes integer not null default 20,
  unique (tournament_id, level_number)
);

alter table public.tournament_blind_levels enable row level security;

create policy "Tout le monde peut voir les niveaux d'un tournoi"
  on public.tournament_blind_levels for select
  to authenticated
  using (true);

create policy "L'organisateur ou un co-administrateur peut définir les niveaux"
  on public.tournament_blind_levels for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_blind_levels.tournament_id and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournament_blind_levels.tournament_id and a.user_id = auth.uid()
    )
  );

-- ============================================================
-- Suivi des jetons, recaves, add-on et bounty par joueur
-- ============================================================
alter table public.tournament_players
  add column if not exists stack integer,
  add column if not exists rebuys_count integer not null default 0,
  add column if not exists addon_used boolean not null default false,
  add column if not exists bounty_current numeric,
  add column if not exists bounty_cash_won numeric not null default 0,
  add column if not exists eliminated_by uuid references public.profiles (id);

-- À l'inscription : vérifie que le tournoi accepte encore des
-- joueurs (complet, inscriptions tardives) et initialise le
-- tapis et la prime de départ.
create or replace function public.check_tournament_registration()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  t record;
  nb_joueurs integer;
begin
  select * into t from public.tournaments where id = new.tournament_id;

  if t.status = 'termine' then
    raise exception 'Ce tournoi est terminé.';
  end if;

  if t.status = 'en_cours' and not t.late_registration_enabled then
    raise exception 'Les inscriptions tardives ne sont pas autorisées pour ce tournoi.';
  end if;

  if t.status = 'en_cours' and t.late_registration_enabled
     and t.late_registration_until_level is not null
     and t.current_level > t.late_registration_until_level then
    raise exception 'La période d''inscription tardive est terminée.';
  end if;

  if t.max_players is not null then
    select count(*) into nb_joueurs
    from public.tournament_players
    where tournament_id = new.tournament_id;

    if nb_joueurs >= t.max_players then
      raise exception 'Ce tournoi est complet.';
    end if;
  end if;

  new.stack := coalesce(new.stack, t.starting_stack);
  if t.bounty_enabled then
    new.bounty_current := coalesce(new.bounty_current, t.bounty_amount);
  end if;

  return new;
end;
$$;

drop trigger if exists before_tournament_player_insert on public.tournament_players;
create trigger before_tournament_player_insert
  before insert on public.tournament_players
  for each row execute function public.check_tournament_registration();
