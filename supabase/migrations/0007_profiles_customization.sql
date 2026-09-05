-- Champs de profil personnalisables, tous optionnels.
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists city text,
  add column if not exists player_type text
    check (
      player_type is null
      or player_type in ('serre_passif', 'serre_agressif', 'loose_passif', 'loose_agressif')
    );

-- Bucket de stockage public pour les photos de profil.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Les avatars sont visibles par tous"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Un utilisateur peut uploader son propre avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Un utilisateur peut modifier son propre avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Un utilisateur peut supprimer son propre avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
