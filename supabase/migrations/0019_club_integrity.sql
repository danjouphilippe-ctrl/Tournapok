-- ============================================================
-- Phase 4 du plan "Clubs & Visibilité" : avant d'ouvrir l'interface
-- de création/édition avec un sélecteur de club, il faut empêcher
-- qu'un tournoi ou un évènement se rattache à un club que son
-- créateur ne gère pas. Les policies actuelles de tournaments/events
-- n'ont jamais vérifié club_id (la colonne n'existait pas avant la
-- phase 1) — sans ce correctif, n'importe qui pourrait prétendre
-- appartenir à n'importe quel club.
-- ============================================================
-- Le check "event_id" de la policy d'insertion des tournois interroge
-- "events", dont la policy de lecture (phase 3) interroge "tournaments"
-- en retour pour le lien "Fait partie de : ..." — encore un cycle RLS
-- croisé, cette fois entre tournaments et events, qui cassait la
-- création de N'IMPORTE QUEL tournoi (avec ou sans club) depuis la
-- phase 3. Même remède : une fonction security definer.
create or replace function public.can_manage_event(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.created_by = p_user_id
  ) or exists (
    select 1 from public.event_admins a
    where a.event_id = p_event_id and a.user_id = p_user_id
  );
$$;

drop policy "Un utilisateur connecté peut créer un tournoi" on public.tournaments;
create policy "Un utilisateur connecté peut créer un tournoi"
  on public.tournaments for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      tournaments.event_id is null
      or public.can_manage_event(tournaments.event_id, auth.uid())
    )
    and (club_id is null or public.is_club_manager(club_id, auth.uid()))
  );

drop policy "L'organisateur ou un co-administrateur peut modifier le tournoi" on public.tournaments;
create policy "L'organisateur ou un co-administrateur peut modifier le tournoi"
  on public.tournaments for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournaments.id and a.user_id = auth.uid()
    )
  )
  with check (
    club_id is null or public.is_club_manager(club_id, auth.uid())
  );

drop policy "Un utilisateur connecté peut créer un évènement" on public.events;
create policy "Un utilisateur connecté peut créer un évènement"
  on public.events for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (club_id is null or public.is_club_manager(club_id, auth.uid()))
  );

drop policy "L'organisateur ou un co-administrateur peut modifier l'évènement" on public.events;
create policy "L'organisateur ou un co-administrateur peut modifier l'évènement"
  on public.events for update
  to authenticated
  using (
    events.created_by = auth.uid()
    or exists (
      select 1 from public.event_admins ea
      where ea.event_id = events.id and ea.user_id = auth.uid()
    )
  )
  with check (
    club_id is null or public.is_club_manager(club_id, auth.uid())
  );
