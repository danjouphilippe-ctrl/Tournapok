-- ============================================================
-- Phase 3 du plan "Clubs & Visibilité" (suite) : coordonnées de
-- contact pour un futur annuaire, visibilité public/privé du club
-- lui-même, et demande d'adhésion pour un club public — sur le
-- modèle exact de tournament_join_requests (0010).
-- ============================================================
alter table public.clubs
  add column if not exists legal_form text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists visibility text not null default 'private'
    check (visibility in ('public', 'private'));

create table if not exists public.club_join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (club_id, requester_id)
);

alter table public.club_join_requests enable row level security;

-- is_club_manager() (0017, security definer) plutôt qu'une sous-requête
-- brute vers "clubs" : la policy de lecture de "clubs" (plus bas) va
-- justement interroger club_join_requests en retour (pour qu'un
-- demandeur en attente voie toujours le club concerné) — une
-- sous-requête directe ici recréerait le cycle croisé déjà rencontré
-- trois fois pendant la mise en place des clubs.
create policy "Voir ses demandes ou celles de son club"
  on public.club_join_requests for select
  to authenticated
  using (
    requester_id = auth.uid()
    or public.is_club_manager(club_id, auth.uid())
  );

create policy "Un utilisateur peut demander à adhérer"
  on public.club_join_requests for insert
  to authenticated
  with check (requester_id = auth.uid());

create policy "Le propriétaire ou un admin peut traiter une demande"
  on public.club_join_requests for update
  to authenticated
  using (public.is_club_manager(club_id, auth.uid()));

create policy "Le demandeur peut annuler sa demande"
  on public.club_join_requests for delete
  to authenticated
  using (requester_id = auth.uid());

-- Resserre la lecture des clubs, jusqu'ici ouverte à tout utilisateur
-- connecté (using (true)) : un club privé ne doit être trouvable que
-- par son propriétaire, ses membres/managers, ou quelqu'un qui a une
-- demande d'adhésion en attente — même principe que la visibilité des
-- tournois/évènements (0018).
drop policy "Tout le monde peut voir les clubs" on public.clubs;
create policy "Visible selon la visibilité du club"
  on public.clubs for select
  to authenticated
  using (
    visibility = 'public'
    or created_by = auth.uid()
    or public.is_club_member(id, auth.uid())
    or exists (
      select 1 from public.club_join_requests r
      where r.club_id = clubs.id and r.requester_id = auth.uid()
    )
  );
