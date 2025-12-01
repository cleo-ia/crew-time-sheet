-- Correction de la liaison auth_user_id pour Sébastian BOUILLET
-- Cela permettra son auto-sélection lors de la connexion sur la page d'accueil

UPDATE utilisateurs
SET auth_user_id = 'baae0cf8-a1a6-47ba-9edb-ca46499d2b9b',
    updated_at = now()
WHERE id = 'b1c4faa1-2050-4cdd-8a73-24d0cc190cfb';