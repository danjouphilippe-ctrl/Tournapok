-- ============================================================
-- Corrige un manque réel découvert en testant la phase 4 : la table
-- "clubs" n'a jamais eu de policy RLS pour UPDATE (seulement select/
-- insert/delete depuis 0017). "updateClub" (modifier le club, ajouter
-- une bannière/un logo...) échouait donc silencieusement : Postgres
-- ne renvoie pas d'erreur quand une policy RLS filtre une ligne, juste
-- 0 ligne modifiée — exactement le genre de bug qu'un simple test
-- manuel ne révèle pas si on ne vérifie pas le résultat.
-- ============================================================
create policy "Le propriétaire ou un admin peut modifier le club"
  on public.clubs for update
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_club_manager(id, auth.uid())
  );
