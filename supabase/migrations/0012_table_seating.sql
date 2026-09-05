-- Attribution des tables et des places.
alter table public.tournament_players
  add column if not exists table_number integer,
  add column if not exists seat_number integer;
