

## Purge S15 — Ajout à la liste blanche

La fonction `purge-week` a une liste blanche de semaines autorisées (ligne 43) qui ne contient pas `2026-S15`. Il faut l'ajouter.

### Changement

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/purge-week/index.ts` | Ajouter `'2026-S15'` dans le tableau `allowedWeeks` (ligne 43) |

Après déploiement, j'appellerai la fonction pour purger les 10 fiches S15 et toutes les données associées (fiches_jours, signatures, transport, affectations, planning).

