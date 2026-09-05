-- Bibliothèque de structures de blindes officielles, de turbo à
-- très lent. Elles n'appartiennent à personne (created_by = null),
-- donc non modifiables directement : les utilisateurs les dupliquent
-- pour créer leur propre version personnalisable.

with s as (
  insert into public.blind_structures (name, description, speed_preset, created_by)
  values (
    'Hyper-turbo',
    'Parties très rapides, niveaux de 5 minutes. Idéal pour un tournoi éclair.',
    'hyperturbo',
    null
  )
  returning id
)
insert into public.blind_structure_levels (structure_id, level_number, is_break, small_blind, big_blind, ante, duration_minutes)
select s.id, l.level_number, l.is_break, l.small_blind, l.big_blind, l.ante, l.duration_minutes
from s, (values
  (1, false, 25, 50, 0, 5),
  (2, false, 50, 100, 0, 5),
  (3, false, 75, 150, 0, 5),
  (4, false, 100, 200, 25, 5),
  (5, false, 150, 300, 25, 5),
  (6, true, 0, 0, 0, 10),
  (7, false, 200, 400, 50, 5),
  (8, false, 300, 600, 50, 5),
  (9, false, 400, 800, 75, 5),
  (10, false, 500, 1000, 100, 5),
  (11, true, 0, 0, 0, 10),
  (12, false, 600, 1200, 100, 5),
  (13, false, 800, 1600, 200, 5),
  (14, false, 1000, 2000, 200, 5),
  (15, false, 1500, 3000, 300, 5),
  (16, false, 2000, 4000, 400, 5)
) as l(level_number, is_break, small_blind, big_blind, ante, duration_minutes);

with s as (
  insert into public.blind_structures (name, description, speed_preset, created_by)
  values (
    'Turbo',
    'Rythme soutenu, niveaux de 10 minutes. Un bon compromis vitesse/stratégie.',
    'turbo',
    null
  )
  returning id
)
insert into public.blind_structure_levels (structure_id, level_number, is_break, small_blind, big_blind, ante, duration_minutes)
select s.id, l.level_number, l.is_break, l.small_blind, l.big_blind, l.ante, l.duration_minutes
from s, (values
  (1, false, 25, 50, 0, 10),
  (2, false, 50, 100, 0, 10),
  (3, false, 75, 150, 0, 10),
  (4, false, 100, 200, 25, 10),
  (5, false, 150, 300, 25, 10),
  (6, true, 0, 0, 0, 10),
  (7, false, 200, 400, 50, 10),
  (8, false, 300, 600, 50, 10),
  (9, false, 400, 800, 75, 10),
  (10, false, 500, 1000, 100, 10),
  (11, true, 0, 0, 0, 10),
  (12, false, 600, 1200, 100, 10),
  (13, false, 800, 1600, 200, 10),
  (14, false, 1000, 2000, 200, 10)
) as l(level_number, is_break, small_blind, big_blind, ante, duration_minutes);

with s as (
  insert into public.blind_structures (name, description, speed_preset, created_by)
  values (
    'Standard',
    'Rythme classique, niveaux de 20 minutes. Le bon équilibre pour la plupart des soirées.',
    'standard',
    null
  )
  returning id
)
insert into public.blind_structure_levels (structure_id, level_number, is_break, small_blind, big_blind, ante, duration_minutes)
select s.id, l.level_number, l.is_break, l.small_blind, l.big_blind, l.ante, l.duration_minutes
from s, (values
  (1, false, 25, 50, 0, 20),
  (2, false, 50, 100, 0, 20),
  (3, false, 75, 150, 0, 20),
  (4, false, 100, 200, 25, 20),
  (5, true, 0, 0, 0, 15),
  (6, false, 150, 300, 25, 20),
  (7, false, 200, 400, 50, 20),
  (8, false, 300, 600, 50, 20),
  (9, false, 400, 800, 75, 20),
  (10, true, 0, 0, 0, 15),
  (11, false, 500, 1000, 100, 20),
  (12, false, 600, 1200, 100, 20),
  (13, false, 800, 1600, 200, 20),
  (14, false, 1000, 2000, 200, 20)
) as l(level_number, is_break, small_blind, big_blind, ante, duration_minutes);

with s as (
  insert into public.blind_structures (name, description, speed_preset, created_by)
  values (
    'Lent',
    'Niveaux de 30 minutes, pour laisser plus de place à la stratégie.',
    'personnalise',
    null
  )
  returning id
)
insert into public.blind_structure_levels (structure_id, level_number, is_break, small_blind, big_blind, ante, duration_minutes)
select s.id, l.level_number, l.is_break, l.small_blind, l.big_blind, l.ante, l.duration_minutes
from s, (values
  (1, false, 25, 50, 0, 30),
  (2, false, 50, 100, 0, 30),
  (3, false, 75, 150, 0, 30),
  (4, false, 100, 200, 25, 30),
  (5, true, 0, 0, 0, 15),
  (6, false, 125, 250, 25, 30),
  (7, false, 150, 300, 25, 30),
  (8, false, 200, 400, 50, 30),
  (9, false, 300, 600, 50, 30),
  (10, true, 0, 0, 0, 15),
  (11, false, 400, 800, 75, 30),
  (12, false, 500, 1000, 100, 30),
  (13, false, 600, 1200, 100, 30),
  (14, false, 800, 1600, 200, 30)
) as l(level_number, is_break, small_blind, big_blind, ante, duration_minutes);

with s as (
  insert into public.blind_structures (name, description, speed_preset, created_by)
  values (
    'Très lent (deepstack)',
    'Niveaux de 45 minutes et progression douce des blindes, pour un tournoi deepstack.',
    'deepstack',
    null
  )
  returning id
)
insert into public.blind_structure_levels (structure_id, level_number, is_break, small_blind, big_blind, ante, duration_minutes)
select s.id, l.level_number, l.is_break, l.small_blind, l.big_blind, l.ante, l.duration_minutes
from s, (values
  (1, false, 25, 50, 0, 45),
  (2, false, 50, 100, 0, 45),
  (3, false, 75, 150, 0, 45),
  (4, false, 100, 200, 0, 45),
  (5, true, 0, 0, 0, 20),
  (6, false, 125, 250, 25, 45),
  (7, false, 150, 300, 25, 45),
  (8, false, 200, 400, 50, 45),
  (9, false, 250, 500, 50, 45),
  (10, true, 0, 0, 0, 20),
  (11, false, 300, 600, 75, 45),
  (12, false, 400, 800, 75, 45),
  (13, false, 500, 1000, 100, 45),
  (14, false, 600, 1200, 100, 45)
) as l(level_number, is_break, small_blind, big_blind, ante, duration_minutes);
