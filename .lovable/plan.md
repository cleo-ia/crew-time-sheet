

## Remplir "AUCUN" pour PAM et ECOLE

### Contexte
- **PAM** : id `5e9f9798-06be-4e70-a9b0-e7d02b22347a` — 0/73 configurés
- **ECOLE** : id `41a4da9f-58b2-45ed-bced-7a8a72b52d03` — 0/73 configurés
- 73 employés terrain, aucun code trajet existant pour ces deux chantiers

### Action
Exécuter via psql un `INSERT INTO codes_trajet_defaut` qui :
1. Sélectionne les 73 employés terrain de l'entreprise
2. Croise avec les 2 chantiers (PAM + ECOLE)
3. Insère 146 lignes avec `code_trajet = 'AUCUN'`
4. Utilise `ON CONFLICT DO NOTHING` pour éviter les doublons

Requête unique, aucune modification de code.

