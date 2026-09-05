-- Répartition des gains : pourcentage du prize pool par place payée.
create table if not exists public.tournament_payouts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  place integer not null,
  percentage numeric not null check (percentage > 0 and percentage <= 100),
  unique (tournament_id, place)
);

alter table public.tournament_payouts enable row level security;

create policy "Tout le monde peut voir la répartition des gains"
  on public.tournament_payouts for select
  to authenticated
  using (true);

create policy "L'organisateur ou un co-administrateur peut définir la répartition"
  on public.tournament_payouts for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_payouts.tournament_id and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournament_payouts.tournament_id and a.user_id = auth.uid()
    )
  );

create policy "L'organisateur ou un co-administrateur peut retirer la répartition"
  on public.tournament_payouts for delete
  to authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_payouts.tournament_id and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.tournament_admins a
      where a.tournament_id = tournament_payouts.tournament_id and a.user_id = auth.uid()
    )
  );
