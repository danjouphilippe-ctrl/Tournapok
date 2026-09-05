-- Champs de profil supplémentaires, tous optionnels et sans
-- prétention : un type de joueur "maison" libre (en plus du menu
-- déroulant), un âge, et une petite bio.
alter table public.profiles
  add column if not exists player_type_custom text
    check (player_type_custom is null or char_length(player_type_custom) <= 100),
  add column if not exists age integer
    check (age is null or (age >= 0 and age <= 120)),
  add column if not exists bio text
    check (bio is null or char_length(bio) <= 500);
