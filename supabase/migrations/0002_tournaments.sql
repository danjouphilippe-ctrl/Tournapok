-- Un tournoi de poker.
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  buy_in numeric not null default 0,
  starting_stack integer not null default 10000,
  status text not null default 'inscription'
    check (status in ('inscription', 'en_cours', 'termine')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  started_at timestamptz
);

alter table public.tournaments enable row level security;

create policy "Tout le monde peut voir les tournois"
  on public.tournaments for select
  to authenticated
  using (true);

create policy "Un utilisateur connecté peut créer un tournoi"
  on public.tournaments for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Seul l'organisateur peut modifier son tournoi"
  on public.tournaments for update
  to authenticated
  using (created_by = auth.uid());

-- Un joueur inscrit à un tournoi.
create table if not exists public.tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'inscrit'
    check (status in ('inscrit', 'elimine', 'vainqueur')),
  place integer,
  joined_at timestamptz not null default now(),
  eliminated_at timestamptz,
  unique (tournament_id, player_id)
);

alter table public.tournament_players enable row level security;

create policy "Tout le monde peut voir les inscriptions"
  on public.tournament_players for select
  to authenticated
  using (true);

create policy "Un joueur peut s'inscrire lui-même"
  on public.tournament_players for insert
  to authenticated
  with check (player_id = auth.uid());

create policy "Seul l'organisateur peut mettre à jour les joueurs de son tournoi"
  on public.tournament_players for update
  to authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.created_by = auth.uid()
    )
  );
