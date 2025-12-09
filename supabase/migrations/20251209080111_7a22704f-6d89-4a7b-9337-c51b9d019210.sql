-- Supprimer les affectations des employés test sur le chantier test de Limoge Revillon
DELETE FROM affectations 
WHERE id IN (
  '5ec37af0-ec8a-4c57-8fe9-4e857d4efed6',
  'c31b6614-69ce-47fe-8daf-f4b9057e2ee1',
  '649ecee8-b785-4a09-9513-745105c7addb',
  'd71c6130-26fd-4b16-8563-9801a483a086'
);