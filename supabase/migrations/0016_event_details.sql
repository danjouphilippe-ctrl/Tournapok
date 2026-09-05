-- Le lieu, la date et l'heure deviennent obligatoires pour un
-- évènement (contrairement aux tournois où ils restent optionnels).
-- On comble d'abord les éventuelles lignes existantes pour ne pas
-- casser la contrainte.
update public.events set scheduled_at = now() where scheduled_at is null;
update public.events set location = 'À définir' where location is null;

alter table public.events
  alter column scheduled_at set not null,
  alter column location set not null;

-- Infos pratiques libres (hébergement, matériel apporté par qui...)
-- et capacité max de l'évènement (informatif, pas de contrainte
-- d'inscription au niveau évènement).
alter table public.events
  add column if not exists organisation text
    check (organisation is null or char_length(organisation) <= 500),
  add column if not exists max_players integer;
