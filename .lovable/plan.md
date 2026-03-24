

# Codes trajet AMBERIEU → T9 — Limoge Revillon

## Action
Exécuter un INSERT SQL dans `codes_trajet_defaut` pour attribuer le code trajet **T9** à **tous les 69 employés terrain** (chef, macon, grutier, finisseur) de Limoge Revillon pour le chantier **AMBERIEU**.

## Script SQL

```sql
INSERT INTO codes_trajet_defaut (entreprise_id, chantier_id, salarie_id, code_trajet)
SELECT 
  'edd12053-55dc-4f4b-b2ad-5048cb5aa798',
  'h1268dbe1-d9ab-4c54-b739-473f4d692cc8',
  u.id,
  'T9'
FROM utilisateurs u
WHERE u.entreprise_id = 'edd12053-55dc-4f4b-b2ad-5048cb5aa798'
  AND u.role_metier IN ('chef', 'macon', 'grutier', 'finisseur')
ON CONFLICT (entreprise_id, chantier_id, salarie_id)
DO UPDATE SET code_trajet = 'T9', updated_at = now();
```

## Resultat attendu
- 69 lignes insérées/mises à jour dans `codes_trajet_defaut`
- Le chantier AMBERIEU affichera 100% de progression sur la page /codes-trajet
- Prêt pour le chantier suivant après exécution

