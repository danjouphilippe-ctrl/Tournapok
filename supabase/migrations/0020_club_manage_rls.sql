-- ============================================================
-- Phase 5 du plan "Clubs & Visibilité" : un owner/admin du club
-- propriétaire d'un tournoi ou d'un évènement doit pouvoir le gérer
-- sans être ajouté individuellement comme co-administrateur.
--
-- getResourceAccess (couche applicative) a déjà été étendu pour
-- reconnaître ce cas — mais l'app n'est qu'un premier filtre : la
-- vraie autorisation reste dans les policies RLS, qui elles ne
-- savaient rien des clubs. Sans ce correctif, un admin de club aurait
-- vu les boutons de gestion s'afficher puis échouer en silence à
-- chaque action, exactement le genre de bug traqué toute la nuit.
--
-- On étend can_manage_tournament()/can_manage_event() (déjà utilisées
-- pour casser les cycles RLS des phases 3-4) pour qu'elles
-- reconnaissent aussi un owner/admin du club propriétaire, puis on
-- remplace par ces fonctions les policies qui dupliquaient encore le
-- même "propriétaire ou co-administrateur" en toutes lettres.
-- ============================================================
create or replace function public.can_manage_tournament(p_tournament_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.tournaments t
    where t.id = p_tournament_id
      and (
        t.created_by = p_user_id
        or (t.club_id is not null and public.is_club_manager(t.club_id, p_user_id))
      )
  ) or exists (
    select 1 from public.tournament_admins a
    where a.tournament_id = p_tournament_id and a.user_id = p_user_id
  );
$$;

create or replace function public.can_manage_event(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and (
        e.created_by = p_user_id
        or (e.club_id is not null and public.is_club_manager(e.club_id, p_user_id))
      )
  ) or exists (
    select 1 from public.event_admins a
    where a.event_id = p_event_id and a.user_id = p_user_id
  );
$$;

drop policy "L'organisateur ou un co-administrateur peut modifier le tournoi" on public.tournaments;
create policy "L'organisateur ou un co-administrateur peut modifier le tournoi"
  on public.tournaments for update
  to authenticated
  using (public.can_manage_tournament(id, auth.uid()))
  with check (
    club_id is null or public.is_club_manager(club_id, auth.uid())
  );

drop policy "L'organisateur ou un co-administrateur peut modifier l'évènement" on public.events;
create policy "L'organisateur ou un co-administrateur peut modifier l'évènement"
  on public.events for update
  to authenticated
  using (public.can_manage_event(id, auth.uid()))
  with check (
    club_id is null or public.is_club_manager(club_id, auth.uid())
  );

drop policy "L'organisateur ou un co-administrateur peut gérer les joueurs" on public.tournament_players;
create policy "L'organisateur ou un co-administrateur peut gérer les joueurs"
  on public.tournament_players for update
  to authenticated
  using (public.can_manage_tournament(tournament_id, auth.uid()));

drop policy "L'organisateur ou un co-administrateur peut inscrire un joueur" on public.tournament_players;
create policy "L'organisateur ou un co-administrateur peut inscrire un joueur"
  on public.tournament_players for insert
  to authenticated
  with check (public.can_manage_tournament(tournament_id, auth.uid()));

drop policy "L'organisateur ou un co-administrateur peut définir les niveaux" on public.tournament_blind_levels;
create policy "L'organisateur ou un co-administrateur peut définir les niveaux"
  on public.tournament_blind_levels for insert
  to authenticated
  with check (public.can_manage_tournament(tournament_id, auth.uid()));

drop policy "L'organisateur ou un co-administrateur peut retirer les niveaux" on public.tournament_blind_levels;
create policy "L'organisateur ou un co-administrateur peut retirer les niveaux"
  on public.tournament_blind_levels for delete
  to authenticated
  using (public.can_manage_tournament(tournament_id, auth.uid()));

drop policy "L'organisateur ou un co-administrateur peut définir la répartition" on public.tournament_payouts;
create policy "L'organisateur ou un co-administrateur peut définir la répartition"
  on public.tournament_payouts for insert
  to authenticated
  with check (public.can_manage_tournament(tournament_id, auth.uid()));

drop policy "L'organisateur ou un co-administrateur peut retirer la répartition" on public.tournament_payouts;
create policy "L'organisateur ou un co-administrateur peut retirer la répartition"
  on public.tournament_payouts for delete
  to authenticated
  using (public.can_manage_tournament(tournament_id, auth.uid()));

drop policy "L'organisateur peut inviter un joueur" on public.tournament_invitations;
create policy "L'organisateur peut inviter un joueur"
  on public.tournament_invitations for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and public.can_manage_tournament(tournament_id, auth.uid())
  );

drop policy "L'organisateur peut annuler une invitation" on public.tournament_invitations;
create policy "L'organisateur peut annuler une invitation"
  on public.tournament_invitations for delete
  to authenticated
  using (public.can_manage_tournament(tournament_id, auth.uid()));

drop policy "L'organisateur peut traiter une demande" on public.tournament_join_requests;
create policy "L'organisateur peut traiter une demande"
  on public.tournament_join_requests for update
  to authenticated
  using (public.can_manage_tournament(tournament_id, auth.uid()));
