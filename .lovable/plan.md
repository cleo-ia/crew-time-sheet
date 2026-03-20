

## Remplir "AUCUN" pour PAM et ECOLE

### Contexte
- **PAM** : `5e9f9798-06be-4e70-a9b0-e7d02b22347a` — 0/73 configurés
- **ECOLE** : `41a4da9f-58b2-45ed-bced-7a8a72b52d03` — 0/73 configurés
- 73 employés terrain identifiés, aucun code trajet existant pour ces deux chantiers

### Action
Insérer 146 lignes dans `codes_trajet_defaut` (73 employés x 2 chantiers) avec `code_trajet = 'AUCUN'`, via une requête SQL d'insertion groupée avec `ON CONFLICT DO NOTHING` pour éviter tout doublon.

Aucune modification de code. Uniquement une opération de données.

### Résultat
Les compteurs passeront de 0/73 à 73/73 pour PAM et ECOLE.

