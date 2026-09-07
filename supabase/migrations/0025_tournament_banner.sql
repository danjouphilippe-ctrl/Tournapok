-- Bannière de tournoi, sur le modèle exact des bannières de club (0023).
alter table public.tournaments
  add column if not exists banner_url text;

insert into storage.buckets (id, name, public)
values ('tournament-banners', 'tournament-banners', true)
on conflict (id) do nothing;

create policy "Les bannières de tournoi sont visibles par tous"
  on storage.objects for select
  using (bucket_id = 'tournament-banners');

create policy "Un utilisateur peut uploader sa propre bannière de tournoi"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tournament-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Un utilisateur peut modifier sa propre bannière de tournoi"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tournament-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Un utilisateur peut supprimer sa propre bannière de tournoi"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tournament-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
