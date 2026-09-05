-- Design "jeton de poker" rond associé à un tournoi : soit un des
-- presets fournis (chemin statique /chips/preset-XX.svg), soit une
-- image importée par l'organisateur et recadrée en rond.
alter table public.tournaments
  add column if not exists chip_image_url text;

-- Bucket de stockage public pour les designs de jeton importés.
insert into storage.buckets (id, name, public)
values ('tournament-chips', 'tournament-chips', true)
on conflict (id) do nothing;

create policy "Les jetons de tournoi sont visibles par tous"
  on storage.objects for select
  using (bucket_id = 'tournament-chips');

create policy "Un utilisateur peut uploader son propre jeton de tournoi"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tournament-chips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Un utilisateur peut modifier son propre jeton de tournoi"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tournament-chips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Un utilisateur peut supprimer son propre jeton de tournoi"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tournament-chips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
