-- Supprimer d'abord les fiches_jours liées
DELETE FROM fiches_jours WHERE fiche_id IN (
  '5a1b026d-fc3a-43f3-b938-55126ddefe50',
  '625d26e3-1406-4b18-b0e5-2516a1392306',
  'dd3f2f3a-f393-4c33-bc18-56129295d734'
);

-- Supprimer les signatures liées
DELETE FROM signatures WHERE fiche_id IN (
  '5a1b026d-fc3a-43f3-b938-55126ddefe50',
  '625d26e3-1406-4b18-b0e5-2516a1392306',
  'dd3f2f3a-f393-4c33-bc18-56129295d734'
);

-- Supprimer les fiches
DELETE FROM fiches WHERE id IN (
  '5a1b026d-fc3a-43f3-b938-55126ddefe50',
  '625d26e3-1406-4b18-b0e5-2516a1392306',
  'dd3f2f3a-f393-4c33-bc18-56129295d734'
);