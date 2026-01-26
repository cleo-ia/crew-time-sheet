-- Correction des fiches S04 avec chantier_id NULL
-- Pour Hassan EL JAMRAJ, il y a déjà une fiche avec le bon chantier, on supprime l'orpheline

-- 1. Supprimer les données liées à la fiche orpheline de Hassan EL JAMRAJ
DELETE FROM fiches_transport_finisseurs_jours 
WHERE fiche_transport_finisseur_id IN (
  SELECT id FROM fiches_transport_finisseurs 
  WHERE fiche_id = '66556827-aa53-4e8b-93b0-e6e119e10485'
);

DELETE FROM fiches_transport_finisseurs 
WHERE fiche_id = '66556827-aa53-4e8b-93b0-e6e119e10485';

DELETE FROM signatures 
WHERE fiche_id = '66556827-aa53-4e8b-93b0-e6e119e10485';

DELETE FROM fiches_jours 
WHERE fiche_id = '66556827-aa53-4e8b-93b0-e6e119e10485';

DELETE FROM fiches 
WHERE id = '66556827-aa53-4e8b-93b0-e6e119e10485';

-- 2. MAILLARD pour Marco PEREIRA DE CASTRO
UPDATE fiches SET chantier_id = 'c8b507d6-f1ae-4c13-aee9-e069aca0358c'
WHERE id = '1d468b4e-a7cc-45ef-95a0-1fa27dd1e86f';

-- 3. CREUSOT HENRI pour Nuno Miguel DA CONCEICAO CAETANO
UPDATE fiches SET chantier_id = '47df69da-0cb6-46c0-a6cb-6e6caa1dafb7'
WHERE id = '5a3c8609-759d-4195-9966-2149f8ccbf30';

-- 4. BACHEVELIN pour issam benabdalah
UPDATE fiches SET chantier_id = '5b183833-f3a6-4456-a9f2-b122e00a00c4'
WHERE id = '706ad41e-a0b8-4f1a-b648-4a0f53ec66af';

-- 5. BACHEVELIN pour hassan ait mouch
UPDATE fiches SET chantier_id = '5b183833-f3a6-4456-a9f2-b122e00a00c4'
WHERE id = 'bddd0141-7765-4f43-9d81-d3867fbe87de';