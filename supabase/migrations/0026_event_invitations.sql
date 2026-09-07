-- ============================================================
-- Invitations à un évènement.
--
-- Calquées sur tournament_invitations (0010), à une différence près :
-- un évènement n'a pas de liste de participants. Inviter quelqu'un ne
-- l'inscrit donc à rien — ça lui rend l'évènement *visible*, pour qu'il
-- découvre le programme sans avoir à être invité à chaque tournoi.
--
-- Les policies passent par can_manage_event() (security definer, 0020)
-- plutôt que par des sous-requêtes sur events/event_admins : c'est la
-- règle du projet depuis les récursions croisées rencontrées sur les
-- clubs.
-- ============================================================
create table if not exists public.event_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  invited_user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (event_id, invited_user_id)
);

alter table public.event_invitations enable row level security;

create policy "Voir ses invitations ou celles de son évènement"
  on public.event_invitations for select
  to authenticated
  using (
    invited_user_id = auth.uid()
    or public.can_manage_event(event_id, auth.uid())
  );

create policy "L'organisateur peut inviter à son évènement"
  on public.event_invitations for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and public.can_manage_event(event_id, auth.uid())
  );

-- L'invité répond (accepte ou refuse) ; l'organisateur ne modifie pas
-- la réponse, il peut seulement annuler l'invitation (delete).
create policy "L'invité répond à son invitation"
  on public.event_invitations for update
  to authenticated
  using (invited_user_id = auth.uid())
  with check (invited_user_id = auth.uid());

create policy "L'organisateur peut annuler une invitation"
  on public.event_invitations for delete
  to authenticated
  using (public.can_manage_event(event_id, auth.uid()));

-- ============================================================
-- La visibilité de l'évènement suit l'invitation.
--
-- On reprend la policy de 0018 en lui ajoutant une clause. Une
-- invitation refusée ne donne plus accès : c'est le sens d'un refus.
-- ============================================================
drop policy if exists "Visible selon la visibilité de l'évènement" on public.events;
create policy "Visible selon la visibilité de l'évènement"
  on public.events for select
  to authenticated
  using (
    visibility = 'public'
    or created_by = auth.uid()
    or exists (
      select 1 from public.event_admins a
      where a.event_id = events.id and a.user_id = auth.uid()
    )
    or (
      visibility = 'club'
      and club_id is not null
      and public.is_club_member(club_id, auth.uid())
    )
    or exists (
      select 1 from public.event_invitations ei
      where ei.event_id = events.id
        and ei.invited_user_id = auth.uid()
        and ei.status <> 'declined'
    )
    or exists (
      -- Quiconque a un lien avec un tournoi de cet évènement (organisateur,
      -- co-admin, inscrit, invité, demande en attente) voit l'évènement
      -- parent quelle que soit sa visibilité propre — sinon le lien
      -- "Fait partie de : ..." casserait pour un simple joueur inscrit.
      select 1 from public.tournaments t
      where t.event_id = events.id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from public.tournament_admins ta where ta.tournament_id = t.id and ta.user_id = auth.uid())
          or exists (select 1 from public.tournament_players tp where tp.tournament_id = t.id and tp.player_id = auth.uid())
          or exists (select 1 from public.tournament_invitations ti where ti.tournament_id = t.id and ti.invited_user_id = auth.uid())
          or exists (select 1 from public.tournament_join_requests tr where tr.tournament_id = t.id and tr.requester_id = auth.uid())
        )
    )
  );
