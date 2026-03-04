

# État de l'implémentation du plan ECOLE

## Ce qui est FAIT et fonctionnel

| Fichier | Statut |
|---------|--------|
| **Migration DB** (`is_ecole boolean NOT NULL DEFAULT false`) | Fait |
| **`useChantiers.ts`** — `is_ecole` dans l'interface | Fait |
| **`ChantiersManager.tsx`** — Toggle admin + formData + handleEdit | Fait |
| **`useAutoSaveFiche.ts`** — fetch `is_ecole`, skip normalisation 39h, init à 0h | Fait |
| **`useAddEmployeeToFiche.ts`** — init à 0h si ECOLE | Fait |
| **`useCreateFicheJourForAffectation.ts`** — init à 0h si ECOLE | Fait |
| **`rhShared.ts`** — Set ecoleChantierIds + `isAbsent && !isEcole` + propagation `isEcole` dans detailJours | Fait |
| **`useRHData.ts`** — `is_ecole` dans chantiersCodeMap + propagation | Fait |
| **`RHEmployeeDetail.tsx`** — `!isEcole` dans calcul absence + type absence | Fait |
| **`RHWeekDetailDialog.tsx`** — `!day.isEcole` dans calcul absence | Fait |
| **`rhWeekDetailPdfExport.ts`** — `!day.isEcole` dans PDF | Fait |
| **`rhEmployeePdfExport.ts`** — `!day.isEcole` dans PDF | Fait |
| **`FicheDetail.tsx`** — compteur absents exclut ECOLE | Fait |
| **`types.ts`** — colonne `is_ecole` dans les types Supabase | Fait |

## Ce qui est PAS ENCORE FAIT (2 fichiers)

| Fichier | Manquant |
|---------|----------|
| **`supabase/functions/sync-planning-to-teams/index.ts`** | Aucune trace de `is_ecole`. Les fonctions `createNewAffectation` et `copyFichesFromPreviousWeek` n'ont pas été mises à jour pour forcer 0h sur les chantiers ECOLE. |
| **`src/components/transport/ConducteurCombobox.tsx`** | Pas de logique `isEcole` — un employé ECOLE à 0h sera toujours affiché comme "(Absent)" dans la combobox conducteur. |

## Impact du manque

- **Edge function** : Quand le planning est synchronisé automatiquement (dimanche soir via CRON), les fiches créées/copiées pour un chantier ECOLE seront initialisées à 8h/7h au lieu de 0h. C'est le point le plus critique.
- **ConducteurCombobox** : Mineur, impact visuel uniquement dans la sélection de conducteurs pour le transport.

## Plan pour compléter

1. **Edge function `sync-planning-to-teams`** : Ajouter `is_ecole` au select chantiers, puis dans `createNewAffectation` forcer heures/T/PA/code_trajet à 0 si ECOLE, et dans `copyFichesFromPreviousWeek` faire un UPDATE post-copie pour écraser à 0.

2. **`ConducteurCombobox.tsx`** : Recevoir `is_ecole` en prop ou le récupérer depuis le chantier courant, et exclure de la détection d'absence.

Voulez-vous que je complète ces 2 derniers fichiers ?

