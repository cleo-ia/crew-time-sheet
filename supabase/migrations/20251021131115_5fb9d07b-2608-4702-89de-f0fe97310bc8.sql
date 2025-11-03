-- Ajouter le statut AUTO_VALIDE pour les fiches des conducteurs
ALTER TYPE statut_fiche ADD VALUE IF NOT EXISTS 'AUTO_VALIDE';