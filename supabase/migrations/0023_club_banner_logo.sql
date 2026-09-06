-- ============================================================
-- Phase 4 du plan "Clubs & Visibilité" : bannière de club (le logo,
-- lui, existe déjà — clubs.logo_url depuis 0017 — mais passe d'une
-- simple URL saisie à la main à un vrai import + recadrage, sur le
-- modèle exact des logos d'évènement et jetons de tournoi (0014/0015).
-- ============================================================
alter table public.clubs
  add column if not exists banner_url text;

insert into storage.buckets (id, name, public)
values ('club-banners', 'club-banners', true)
on conflict (id) do nothing;

create policy "Les bannières de club sont visibles par tous"
  on storage.objects for select
  using (bucket_id = 'club-banners');

create policy "Un utilisateur peut uploader sa propre bannière de club"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'club-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Un utilisateur peut modifier sa propre bannière de club"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'club-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Un utilisateur peut supprimer sa propre bannière de club"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'club-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

insert into storage.buckets (id, name, public)
values ('club-logos', 'club-logos', true)
on conflict (id) do nothing;

create policy "Les logos de club sont visibles par tous"
  on storage.objects for select
  using (bucket_id = 'club-logos');

create policy "Un utilisateur peut uploader son propre logo de club"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'club-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Un utilisateur peut modifier son propre logo de club"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'club-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Un utilisateur peut supprimer son propre logo de club"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'club-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
