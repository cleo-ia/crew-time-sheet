-- Supprimer le doublon ancien sans données (0a877336)
DELETE FROM utilisateurs WHERE id = '0a877336-3bb0-4333-a5da-62e8715f304d';

-- Créer l'index unique anti-doublons (case-insensitive)
CREATE UNIQUE INDEX idx_utilisateurs_nom_prenom_entreprise 
ON utilisateurs (LOWER(nom), LOWER(prenom), entreprise_id);