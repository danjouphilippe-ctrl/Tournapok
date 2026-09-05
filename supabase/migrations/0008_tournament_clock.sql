-- État de l'horloge du tournoi : en cours, en pause, ou pas encore
-- démarré. level_ends_at est l'heure absolue à laquelle le niveau
-- actuel se termine (utilisé quand la pendule tourne).
-- paused_remaining_seconds fige le temps restant quand on met en
-- pause (manuellement ou en changeant de niveau).
alter table public.tournaments
  add column if not exists clock_status text not null default 'stopped'
    check (clock_status in ('stopped', 'running', 'paused')),
  add column if not exists level_ends_at timestamptz,
  add column if not exists paused_remaining_seconds integer,
  add column if not exists display_config jsonb not null default '{
    "title": null,
    "show_entries": true,
    "show_players_remaining": true,
    "show_rebuys": true,
    "show_addons": true,
    "show_chip_count": true,
    "show_average_stack": true,
    "show_prize_pool": true,
    "show_next_break": true,
    "show_payouts": true
  }'::jsonb;

-- Active la synchronisation en temps réel : la page d'affichage
-- (écran TV) se met à jour instantanément quand l'organisateur agit
-- depuis son panneau de contrôle (pause, changement de niveau,
-- recave, élimination...).
alter publication supabase_realtime add table public.tournaments;
alter publication supabase_realtime add table public.tournament_players;
