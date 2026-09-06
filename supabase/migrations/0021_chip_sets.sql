-- ============================================================
-- Jeux de jetons réutilisables (composition physique : couleur +
-- valeur), sur le modèle exact de blind_structures/blind_structure_
-- levels, et cave de départ d'un tournoi choisie parmi les
-- dénominations du jeu sélectionné, sur le modèle de
-- tournament_payouts.
-- ============================================================
create table if not exists public.chip_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.chip_sets enable row level security;

create policy "Tout le monde peut voir les jeux de jetons"
  on public.chip_sets for select
  to authenticated
  using (true);

create policy "Un utilisateur peut créer un jeu de jetons"
  on public.chip_sets for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Le créateur peut modifier son jeu de jetons"
  on public.chip_sets for update
  to authenticated
  using (created_by = auth.uid());

create policy "Le créateur peut supprimer son jeu de jetons"
  on public.chip_sets for delete
  to authenticated
  using (created_by = auth.uid());

create table if not exists public.chip_denominations (
  id uuid primary key default gen_random_uuid(),
  chip_set_id uuid not null references public.chip_sets (id) on delete cascade,
  color text not null,
  value numeric not null check (value > 0)
);

alter table public.chip_denominations enable row level security;

create policy "Tout le monde peut voir les dénominations"
  on public.chip_denominations for select
  to authenticated
  using (true);

create policy "Le créateur peut ajouter des dénominations à son jeu"
  on public.chip_denominations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.chip_sets s
      where s.id = chip_set_id and s.created_by = auth.uid()
    )
  );

create policy "Le créateur peut supprimer les dénominations de son jeu"
  on public.chip_denominations for delete
  to authenticated
  using (
    exists (
      select 1 from public.chip_sets s
      where s.id = chip_set_id and s.created_by = auth.uid()
    )
  );

alter table public.tournaments
  add column if not exists chip_set_id uuid references public.chip_sets (id) on delete set null;

create table if not exists public.tournament_chip_rack (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  denomination_id uuid not null references public.chip_denominations (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unique (tournament_id, denomination_id)
);

alter table public.tournament_chip_rack enable row level security;

create policy "Tout le monde peut voir la cave de départ"
  on public.tournament_chip_rack for select
  to authenticated
  using (true);

-- can_manage_tournament() existe déjà (0020) : on la réutilise telle
-- quelle plutôt que de dupliquer la logique organisateur/co-admin/club.
create policy "L'organisateur ou un co-administrateur peut définir la cave"
  on public.tournament_chip_rack for insert
  to authenticated
  with check (public.can_manage_tournament(tournament_id, auth.uid()));

create policy "L'organisateur ou un co-administrateur peut retirer la cave"
  on public.tournament_chip_rack for delete
  to authenticated
  using (public.can_manage_tournament(tournament_id, auth.uid()));
