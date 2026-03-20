

## Re-exécuter l'insertion pour PAM et ECOLE

### Problème
La migration précédente n'a pas inséré les données pour PAM et ECOLE (0 lignes en base). Les 73 lignes de 2CB-Atelier sont bien présentes.

### Solution
Créer une nouvelle migration avec exactement le même SQL pour insérer les 146 lignes manquantes (73 employés x 2 chantiers) avec `code_trajet = 'AUCUN'`.

### Action
Une seule migration SQL :
```sql
INSERT INTO codes_trajet_defaut (entreprise_id, chantier_id, salarie_id, code_trajet)
SELECT 'edd12053-...', c.chantier_id, u.id, 'AUCUN'
FROM utilisateurs u
CROSS JOIN (VALUES ('5e9f9798-...'::uuid), ('41a4da9f-...'::uuid)) AS c(chantier_id)
WHERE u.entreprise_id = 'edd12053-...'
  AND u.role_metier IN ('chef','macon','grutier','finisseur')
ON CONFLICT DO NOTHING;
```

Aucune modification de code. Uniquement une ré-exécution de l'insertion en base.

### Résultat
PAM et ECOLE passeront de 0/73 à 73/73.

