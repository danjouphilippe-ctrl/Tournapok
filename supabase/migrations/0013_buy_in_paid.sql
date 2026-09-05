-- Un joueur peut être inscrit sans avoir encore payé son buy-in
-- (inscription en ligne à l'avance, invitation, etc.). Seuls les
-- buy-ins marqués payés comptent dans le prize pool.
alter table public.tournament_players
  add column if not exists buy_in_paid boolean not null default false;
