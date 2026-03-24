

# Bulk Insert — Codes trajet pour 20 chantiers Limoge Revillon

## Mapping vérifié

J'ai croisé ta liste avec la base. Note : "BECHELIN" = **BECHEVELIN** en base, "MASILLY" = **MASSILLY** en base.

| Chantier | ID | Code |
|---|---|---|
| BECHEVELIN | 5b183833-... | T9 |
| CAPUCINES | 141104ca-... | T8 |
| CHEVIGNY ST SAUVEUR | 4dc332aa-... | T13 |
| COLLONGE | 00e6f4dd-... | T16 |
| CREUSOT HENRI | 47df69da-... | T8 |
| CREUSOT VILET | d81d2592-... | T8 |
| DAVOULT | 200f5d2a-... | T16 |
| FAMILLE | 19481ae5-... | T9 |
| MAILLARD | c8b507d6-... | T16 |
| MASSILLY | b0fba520-... | T2 |
| NUANCE | 7513fea6-... | T6 |
| OLYMPIA | 121fe254-... | T16 |
| PRESTIGE | c694f8dd-... | T2 |
| QUARANTAINE | 47609798-... | T6 |
| ROSALIE | 828147c9-... | T16 |
| SCHUMAN | 640089ad-... | T2 |
| SEYSSIA | a8705b4e-... | T16 |
| VENISSIEUX | 7c4aa98d-... | T10 |
| VILLENEUVE | 960d49c0-... | T6 |
| VILOGIA | c249cad8-... | T9 |

## Action

Un seul script SQL qui insère pour **chacun des 20 chantiers** ci-dessus, une ligne par employé terrain (chef, macon, grutier, finisseur) avec le code trajet correspondant. Utilise `ON CONFLICT` pour mettre à jour les existants.

Cela donnera environ **20 × 69 = ~1380 lignes** insérées/mises à jour dans `codes_trajet_defaut`.

## Script SQL (exécuté via psql)

```sql
INSERT INTO codes_trajet_defaut (entreprise_id, chantier_id, salarie_id, code_trajet)
SELECT 'edd12053-55dc-4f4b-b2ad-5048cb5aa798', v.chantier_id, u.id, v.code_trajet
FROM utilisateurs u
CROSS JOIN (VALUES
  ('5b183833-f3a6-4456-a9f2-b122e00a00c4'::uuid, 'T9'),
  ('141104ca-d6e6-4e9f-a364-97a403037109'::uuid, 'T8'),
  ('4dc332aa-cdf5-4b8e-9f67-0edb978f67ab'::uuid, 'T13'),
  ('00e6f4dd-8e3b-47a7-a9f2-2c73576ce6a5'::uuid, 'T16'),
  ('47df69da-0cb6-46c0-a6cb-6e6caa1dafb7'::uuid, 'T8'),
  ('d81d2592-8a9f-47af-af46-9b972ad67a17'::uuid, 'T8'),
  ('200f5d2a-1ec3-48b3-9d57-0c5359c8733e'::uuid, 'T16'),
  ('19481ae5-9957-47c5-9711-2bef9e6954d7'::uuid, 'T9'),
  ('c8b507d6-f1ae-4c13-aee9-e069aca0358c'::uuid, 'T16'),
  ('b0fba520-13c7-4bcb-ba7d-0bd51b4e7aae'::uuid, 'T2'),
  ('7513fea6-4b61-4834-9dcd-b42a767c5ca8'::uuid, 'T6'),
  ('121fe254-c301-40b4-88eb-85c858d4265a'::uuid, 'T16'),
  ('c694f8dd-9aa1-4df9-832d-3085e808145a'::uuid, 'T2'),
  ('47609798-7893-4ed3-a128-517f8094c368'::uuid, 'T6'),
  ('828147c9-b867-4140-b5eb-dfc30b37e9ff'::uuid, 'T16'),
  ('640089ad-9d0f-4364-a5f3-d82c0e3cb2c7'::uuid, 'T2'),
  ('a8705b4e-ad21-4901-8245-a233d288cfc4'::uuid, 'T16'),
  ('7c4aa98d-5361-4852-bebf-502efcbe3da8'::uuid, 'T10'),
  ('960d49c0-43be-4cbc-ba71-48409a71392d'::uuid, 'T6'),
  ('c249cad8-d647-48ab-8364-077bbdde5289'::uuid, 'T9')
) AS v(chantier_id, code_trajet)
WHERE u.entreprise_id = 'edd12053-55dc-4f4b-b2ad-5048cb5aa798'
  AND u.role_metier IN ('chef', 'macon', 'grutier', 'finisseur')
ON CONFLICT (entreprise_id, chantier_id, salarie_id)
DO UPDATE SET code_trajet = EXCLUDED.code_trajet, updated_at = now();
```

## Vérification post-exécution

Requête de contrôle pour confirmer le nombre de lignes par chantier et le code appliqué.

## Chantiers restants non traités

Les chantiers suivants n'étaient pas dans ta liste (déjà configurés ou hors scope) :
- 2CB-ATELIER, ECOLE, PAM — déjà à "AUCUN"
- AMBERIEU — déjà fait (T9)
- TEST, TEST 2 — chantiers de test

