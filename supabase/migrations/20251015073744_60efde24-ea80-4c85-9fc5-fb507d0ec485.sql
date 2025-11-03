-- Ajouter le rôle 'interimaire' à l'enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'interimaire';