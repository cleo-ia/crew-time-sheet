-- Nettoyage des données contaminées par le cycle A_COMPLETER
-- Cible : jours où code_trajet = 'A_COMPLETER' et T = 1 alors que heures = 0
-- (chantiers secondaires contaminés, pas les chantiers principaux légitimes)

UPDATE fiches_jours 
SET code_trajet = NULL, "T" = 0 
WHERE code_trajet = 'A_COMPLETER' 
  AND "T" = 1 
  AND (heures = 0 OR heures IS NULL);
