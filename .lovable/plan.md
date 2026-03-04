

# Plan affiné : Chantier ECOLE — 0h sans absence

## Le problème

La détection d'absence se fait partout par `heures === 0 && HI === 0`. Un jour ECOLE à 0h serait donc marqué "Absent" et compté dans les absences. Il faut l'exclure **sans** utiliser `type_absence`.

## La solution

Propager le flag `is_ecole` du chantier jusqu'aux points de détection d'absence. Les chantiers sont déjà chargés dans les hooks RH — il suffit d'ajouter `is_ecole` au select et de vérifier `&& !isEcole` dans le calcul `isAbsent`.

## Plan complet (reprend le plan précédent + ce correctif)

### 1. Migration DB
```sql
ALTER TABLE public.chantiers ADD COLUMN is_ecole boolean NOT NULL DEFAULT false;
```

### 2. Interface TypeScript — `useChantiers.ts`
Ajouter `is_ecole?: boolean` à l'interface `Chantier`.

### 3. Toggle admin — `ChantiersManager.tsx`
Switch "Chantier école (heures à 0)" dans le formulaire.

### 4. Initialisation à 0h (4 points — inchangé)
- `sync-planning-to-teams` : `createNewAffectation` + `copyFichesFromPreviousWeek` → 0h si `is_ecole`
- `useAutoSaveFiche.ts` → skip normalisation 39h + force 0h si `is_ecole`
- `useAddEmployeeToFiche.ts` → init à 0h si `is_ecole`
- `useCreateFicheJourForAffectation.ts` → init à 0h si `is_ecole`

### 5. NOUVEAU — Exclusion de la détection d'absence (6 fichiers)

L'idée : chaque `fiches_jours` a un `code_chantier_du_jour` ou est lié à un chantier via sa fiche. On utilise le flag `is_ecole` du chantier pour exclure ces jours.

| Fichier | Comment | Modification |
|---------|---------|-------------|
| `src/hooks/rhShared.ts` (L.661) | Chantiers déjà chargés dans la query. Ajouter `is_ecole` au select, construire un Set de codes ECOLE, vérifier `code_chantier_du_jour` | `isAbsent = heuresDuJour === 0 && intemperie === 0 && !isEcoleChantier` |
| `src/hooks/useRHData.ts` (L.789) | Chantiers déjà chargés (L.747-750). Ajouter `is_ecole` au select, vérifier via `chantiersCodeMap` | `isAbsent = ... && !isEcole` |
| `src/components/rh/RHEmployeeDetail.tsx` (L.352) | Reçoit `dailyDetails` du hook. Ajouter un champ `isEcole` dans les données retournées par le hook, l'utiliser ici | `isAbsent = day.heuresNormales === 0 && !isOnOtherSite && !day.isEcole` |
| `src/components/rh/RHWeekDetailDialog.tsx` (L.120) | Idem, utiliser `day.isEcole` | `isAbsent = ... && !day.isEcole` |
| `src/lib/rhWeekDetailPdfExport.ts` (L.294) | Idem | `isAbsent = ... && !day.isEcole` |
| `src/lib/rhEmployeePdfExport.ts` (L.362) | Idem | `isAbsent = ... && !day.isEcole` |
| `src/components/validation/FicheDetail.tsx` (L.449-451) | Fiche a `chantier_id`, charger `is_ecole` avec le chantier | Exclure du compteur d'absents |
| `src/components/transport/ConducteurCombobox.tsx` (L.77) | Passer `is_ecole` du chantier courant | `isAbsent = ... && !isEcole` |

### Flux de données pour le flag `isEcole`

```text
chantiers.is_ecole (DB)
  ↓
rhShared.ts : select chantiers avec is_ecole → Set<codeEcole>
  → pour chaque jour : isEcole = ecoleCodesSet.has(code_chantier_du_jour)
  → isAbsent = heures===0 && HI===0 && !isEcole
  → detailJours[].isEcole = true/false  ← propagé dans l'objet retourné
     ↓
  RHEmployeeDetail / RHWeekDetailDialog / PDF exports
  → utilisent day.isEcole pour exclure de l'affichage "Absent"
```

### 6. Exports Excel/PDF — Pas d'absence comptée

Les exports (`excelExport.ts`, `rhEmployeePdfExport.ts`) lisent `isAbsent` depuis les données consolidées. Comme on corrige `isAbsent` à la source (hooks), les exports sont automatiquement corrects — un jour ECOLE à 0h ne sera pas compté comme absence.

### 7. Affichage RH — Pas de "À qualifier"

Dans `RHEmployeeDetail.tsx` (L.490-494), la colonne "Type absence" affiche "À qualifier" quand `heuresNormales === 0`. On ajoutera la condition `&& !day.isEcole` pour afficher "-" (pas d'absence) sur les jours ECOLE.

## Récapitulatif des fichiers impactés

| Fichier | Type de modification |
|---------|---------------------|
| Migration SQL | Nouvelle colonne `is_ecole` |
| `src/hooks/useChantiers.ts` | Interface TypeScript |
| `src/components/admin/ChantiersManager.tsx` | Toggle admin |
| `src/hooks/useAutoSaveFiche.ts` | Skip normalisation + force 0h |
| `src/hooks/useAddEmployeeToFiche.ts` | Init à 0h |
| `src/hooks/useCreateFicheJourForAffectation.ts` | Init à 0h |
| `supabase/functions/sync-planning-to-teams/index.ts` | Create + copy à 0h |
| `src/hooks/rhShared.ts` | Exclusion absence + propagation `isEcole` |
| `src/hooks/useRHData.ts` | Exclusion absence + propagation `isEcole` |
| `src/components/rh/RHEmployeeDetail.tsx` | Affichage : pas "Absent", pas "À qualifier" |
| `src/components/rh/RHWeekDetailDialog.tsx` | Affichage : pas "Absent" |
| `src/lib/rhWeekDetailPdfExport.ts` | PDF : pas "Absent" |
| `src/lib/rhEmployeePdfExport.ts` | PDF : pas "Absent" |
| `src/components/validation/FicheDetail.tsx` | Compteur absents conducteur |
| `src/components/transport/ConducteurCombobox.tsx` | Combobox : pas "(Absent)" |

## Zéro régression

- `DEFAULT false` → chantiers existants inchangés
- Logique d'exclusion isolée dans `&& !isEcole` → si le flag est false, rien ne change
- Pas de modification du `type_absence` → aucun impact sur la qualification des absences existantes
- Les chefs ne sont jamais sur ECOLE → aucun impact sur la logique multi-chantier chef

