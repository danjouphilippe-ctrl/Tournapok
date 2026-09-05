-- Corrige un bug d'ambiguïté SQL : dans certaines politiques de
-- sécurité, une colonne était comparée à elle-même au lieu d'être
-- comparée au tournoi concerné (les sous-tables partageaient un nom
-- de colonne identique). Résultat : les co-administrateurs ne
-- pouvaient rien faire (tournois), ou avaient trop de droits
-- (joueurs, niveaux de blindes).

drop policy if exists "L'organisateur ou un co-administrateur peut modifier le tournoi" on public.tournaments;
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

drop policy if exists "L'organisateur ou un co-administrateur peut gérer les joueurs" on public.tournament_players;
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

drop policy if exists "L'organisateur ou un co-administrateur peut définir les niveaux" on public.tournament_blind_levels;
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
