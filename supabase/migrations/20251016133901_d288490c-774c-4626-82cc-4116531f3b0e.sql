-- Suppression des données de test
-- Ordre: d'abord les tables enfants, puis les tables parentes

-- 1. Supprimer les jours de transport
DELETE FROM fiches_transport_jours 
WHERE fiche_transport_id = 'e0bed9fb-aea8-47f3-8d5b-4a45507fc7be';

-- 2. Supprimer la fiche transport
DELETE FROM fiches_transport 
WHERE id = 'e0bed9fb-aea8-47f3-8d5b-4a45507fc7be';

-- 3. Supprimer les jours de fiches
DELETE FROM fiches_jours 
WHERE fiche_id IN (
  'ceeaeab5-8816-4f7a-a0e6-c57ce96a90cc',
  'b7acf3ad-5e88-4a64-a452-9daf985b8905',
  'd8809f96-ef63-449f-9c6b-24b360bb1999',
  'a752bbc1-213f-45a7-8a82-ac5b74609852'
);

-- 4. Supprimer les signatures liées
DELETE FROM signatures 
WHERE fiche_id IN (
  'ceeaeab5-8816-4f7a-a0e6-c57ce96a90cc',
  'b7acf3ad-5e88-4a64-a452-9daf985b8905',
  'd8809f96-ef63-449f-9c6b-24b360bb1999',
  'a752bbc1-213f-45a7-8a82-ac5b74609852'
);

-- 5. Supprimer les fiches
DELETE FROM fiches 
WHERE id IN (
  'ceeaeab5-8816-4f7a-a0e6-c57ce96a90cc',
  'b7acf3ad-5e88-4a64-a452-9daf985b8905',
  'd8809f96-ef63-449f-9c6b-24b360bb1999',
  'a752bbc1-213f-45a7-8a82-ac5b74609852'
);