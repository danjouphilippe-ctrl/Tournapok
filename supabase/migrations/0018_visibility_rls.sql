-- ============================================================
-- Phase 3 du plan "Clubs & Visibilité" : la lecture de tournaments et
-- events dépend désormais de leur visibilité, au lieu d'être ouverte
-- à tout utilisateur connecté (using (true)).
--
-- Toutes les lignes existantes sont "private" (backfill de la phase 2)
-- : rien ne change pour l'organisateur, les co-admins, les joueurs
-- inscrits/invités/en attente de validation — mais un inconnu qui n'a
-- aucun lien avec le tournoi ne le trouvera plus en le parcourant.
-- C'est le but recherché : "privé" doit signifier "sur invitation",
-- pas "visible par tout utilisateur connecté".
-- ============================================================
-- La nouvelle policy de "tournaments" interroge tournament_invitations
-- et tournament_join_requests. Or leurs propres policies de lecture
-- (migration 0010) interrogent "tournaments" en retour pour vérifier
-- qui est organisateur — un cycle RLS croisé, qui provoque la même
-- "infinite recursion detected in policy" que dans club_members. On
-- casse ce cycle avec une fonction security definer, comme en phase 1.
create or replace function public.can_manage_tournament(p_tournament_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.tournaments t
    where t.id = p_tournament_id and t.created_by = p_user_id
  ) or exists (
    select 1 from public.tournament_admins a
    where a.tournament_id = p_tournament_id and a.user_id = p_user_id
  );
$$;

drop policy "Voir ses demandes ou celles de son tournoi" on public.tournament_join_requests;
create policy "Voir ses demandes ou celles de son tournoi"
  on public.tournament_join_requests for select
  to authenticated
  using (
    requester_id = auth.uid()
    or public.can_manage_tournament(tournament_id, auth.uid())
  );

drop policy "Voir ses invitations ou celles de son tournoi" on public.tournament_invitations;
create policy "Voir ses invitations ou celles de son tournoi"
  on public.tournament_invitations for select
  to authenticated
  using (
    invited_user_id = auth.uid()
    or public.can_manage_tournament(tournament_id, auth.uid())
  );

drop policy "Tout le monde peut voir les tournois" on public.tournaments;

create policy "Visible selon la visibilité du tournoi"
  on public.tournaments for select
  to authenticated
  using (
    visibility = 'public'
    or created_by = auth.uid()
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournaments.id and a.user_id = auth.uid()
    )
    or (
      visibility = 'club'
      and club_id is not null
      and public.is_club_member(club_id, auth.uid())
    )
    or exists (
      select 1 from public.tournament_players p
      where p.tournament_id = tournaments.id and p.player_id = auth.uid()
    )
    or exists (
      select 1 from public.tournament_invitations i
      where i.tournament_id = tournaments.id and i.invited_user_id = auth.uid()
    )
    or exists (
      select 1 from public.tournament_join_requests r
      where r.tournament_id = tournaments.id and r.requester_id = auth.uid()
    )
  );

drop policy "Tout le monde peut voir les évènements" on public.events;

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
