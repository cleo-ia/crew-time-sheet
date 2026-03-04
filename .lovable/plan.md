

# État de l'implémentation du plan ECOLE

## TOUT EST FAIT ✅

| Fichier | Statut |
|---------|--------|
| **Migration DB** (`is_ecole boolean NOT NULL DEFAULT false`) | ✅ Fait |
| **`useChantiers.ts`** — `is_ecole` dans l'interface | ✅ Fait |
| **`ChantiersManager.tsx`** — Toggle admin + formData + handleEdit | ✅ Fait |
| **`useAutoSaveFiche.ts`** — fetch `is_ecole`, skip normalisation 39h, init à 0h | ✅ Fait |
| **`useAddEmployeeToFiche.ts`** — init à 0h si ECOLE | ✅ Fait |
| **`useCreateFicheJourForAffectation.ts`** — init à 0h si ECOLE | ✅ Fait |
| **`rhShared.ts`** — Set ecoleChantierIds + `isAbsent && !isEcole` + propagation `isEcole` dans detailJours | ✅ Fait |
| **`useRHData.ts`** — `is_ecole` dans chantiersCodeMap + propagation | ✅ Fait |
| **`RHEmployeeDetail.tsx`** — `!isEcole` dans calcul absence + type absence | ✅ Fait |
| **`RHWeekDetailDialog.tsx`** — `!day.isEcole` dans calcul absence | ✅ Fait |
| **`rhWeekDetailPdfExport.ts`** — `!day.isEcole` dans PDF | ✅ Fait |
| **`rhEmployeePdfExport.ts`** — `!day.isEcole` dans PDF | ✅ Fait |
| **`FicheDetail.tsx`** — compteur absents exclut ECOLE | ✅ Fait |
| **`types.ts`** — colonne `is_ecole` dans les types Supabase | ✅ Fait |
| **`supabase/functions/sync-planning-to-teams/index.ts`** — `is_ecole` dans select + force 0h dans createNewAffectation + override post-copie dans copyFichesFromPreviousWeek | ✅ Fait |
| **`ConducteurCombobox.tsx`** — prop `isEcole` pour exclure de la détection d'absence | ✅ Fait |
