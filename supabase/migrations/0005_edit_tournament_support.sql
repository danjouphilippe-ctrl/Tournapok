-- Permet de remplacer les niveaux de blindes d'un tournoi (utile
-- pour la modification d'un tournoi avant son démarrage : on efface
-- les anciens niveaux puis on réinsère les nouveaux).
create policy "L'organisateur ou un co-administrateur peut retirer les niveaux"
  on public.tournament_blind_levels for delete
  to authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_blind_levels.tournament_id and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournament_blind_levels.tournament_id and a.user_id = auth.uid()
    )
  );

-- Une structure de blindes "officielle" (fournie par l'application,
-- de turbo à très lent) n'appartient à aucun utilisateur : elle ne
-- peut donc pas être modifiée ni supprimée directement (les
-- politiques de modification/suppression exigent created_by =
-- auth.uid(), ce qui exclut les lignes sans propriétaire). Les
-- utilisateurs peuvent en revanche la dupliquer pour en créer leur
-- propre copie modifiable.
alter table public.blind_structures alter column created_by drop not null;
