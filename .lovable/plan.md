

## Corriger les heures de Sébastien BOUILLET sur DAVOULT (S10)

La fiche de Sébastien sur son chantier secondaire DAVOULT en S10 est initialisée à 39h au lieu de 0h. Il faut remettre à zéro les 5 fiches_jours et le total de la fiche.

### Corrections SQL via requête directe

1. **Remettre à zéro les 5 `fiches_jours`** de la fiche `12b20853-c10d-44c2-a77a-f116ce43439d` :
   - `heures` → 0, `HNORM` → 0, `total_jour` → 0
   - `PA` → false, `T` → 0, `code_trajet` → null

2. **Remettre `fiches.total_heures`** → 0 pour cette fiche

Le trigger `recalculate_fiche_total_heures` recalculera automatiquement le total, mais on le force aussi par sécurité.

Aucune modification de code frontend nécessaire. Le cache React Query se rafraîchira automatiquement.

