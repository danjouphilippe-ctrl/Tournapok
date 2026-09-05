-- Invitations envoyées par l'organisateur à des joueurs inscrits sur
-- le site.
create table if not exists public.tournament_invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  invited_user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (tournament_id, invited_user_id)
);

alter table public.tournament_invitations enable row level security;

create policy "Voir ses invitations ou celles de son tournoi"
  on public.tournament_invitations for select
  to authenticated
  using (
    invited_user_id = auth.uid()
    or exists (
      select 1 from public.tournaments t
      where t.id = tournament_invitations.tournament_id and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournament_invitations.tournament_id and a.user_id = auth.uid()
    )
  );

create policy "L'organisateur peut inviter un joueur"
  on public.tournament_invitations for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and (
      exists (
        select 1 from public.tournaments t
        where t.id = tournament_invitations.tournament_id and t.created_by = auth.uid()
      )
      or exists (
        select 1 from public.tournament_admins a
        where a.tournament_id = tournament_invitations.tournament_id and a.user_id = auth.uid()
      )
    )
  );

create policy "L'invité peut répondre à son invitation"
  on public.tournament_invitations for update
  to authenticated
  using (invited_user_id = auth.uid());

create policy "L'organisateur peut annuler une invitation"
  on public.tournament_invitations for delete
  to authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_invitations.tournament_id and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournament_invitations.tournament_id and a.user_id = auth.uid()
    )
  );

-- Demandes de participation envoyées par un joueur à l'organisateur.
create table if not exists public.tournament_join_requests (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (tournament_id, requester_id)
);

alter table public.tournament_join_requests enable row level security;

create policy "Voir ses demandes ou celles de son tournoi"
  on public.tournament_join_requests for select
  to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from public.tournaments t
      where t.id = tournament_join_requests.tournament_id and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournament_join_requests.tournament_id and a.user_id = auth.uid()
    )
  );

create policy "Un joueur peut demander à participer"
  on public.tournament_join_requests for insert
  to authenticated
  with check (requester_id = auth.uid());

create policy "L'organisateur peut traiter une demande"
  on public.tournament_join_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_join_requests.tournament_id and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournament_join_requests.tournament_id and a.user_id = auth.uid()
    )
  );

create policy "Le demandeur peut annuler sa demande"
  on public.tournament_join_requests for delete
  to authenticated
  using (requester_id = auth.uid());

-- Corrige un manque : l'organisateur ou un co-administrateur doit
-- pouvoir inscrire lui-même un joueur (bouton "+ Joueur", ou
-- acceptation d'une demande de participation), pas seulement le
-- joueur pour lui-même.
create policy "L'organisateur ou un co-administrateur peut inscrire un joueur"
  on public.tournament_players for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_players.tournament_id and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournament_players.tournament_id and a.user_id = auth.uid()
    )
  );

-- Permet à l'organisateur de supprimer son tournoi.
create policy "Le créateur peut supprimer son tournoi"
  on public.tournaments for delete
  to authenticated
  using (created_by = auth.uid());
