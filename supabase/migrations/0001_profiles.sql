-- Table des profils joueurs, liée aux comptes d'authentification Supabase.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Les profils sont visibles par tous les utilisateurs connectés"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Un utilisateur peut modifier son propre profil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Crée automatiquement un profil quand un utilisateur s'inscrit,
-- en récupérant le pseudo passé lors du signUp().
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, pseudo)
  values (new.id, new.raw_user_meta_data ->> 'pseudo');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
