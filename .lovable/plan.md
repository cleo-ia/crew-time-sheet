

# Plan : ÉCOLE → 7h/jour (35h/semaine), 0 panier, 0 trajet

## Contexte

Le chantier ÉCOLE est un chantier tampon pour les apprentis à l'école. **Aucun chef ne sera jamais affecté à ce chantier.** On retire donc le point c) sur les chefs.

## 4 fichiers, 4 modifications

### 1. `supabase/functions/sync-planning-to-teams/index.ts`

**a) `copyFichesFromPreviousWeek`** : remplacer `heures: 0, HNORM: 0` par `heures: 7, HNORM: 7` pour ÉCOLE, et `total_heures: 0` par `7 * nombre_de_jours`

**b) `createNewAffectation`** : `isEcole ? 0` → `isEcole ? 7` pour les heures, et `isEcole ? 0` → `isEcole ? (7 * joursPlanning.length)` pour total_heures

### 2. `src/hooks/useAddEmployeeToFiche.ts`
- `total_heures` : `isEcole ? 0 : 39` → `isEcole ? 35 : 39`
- `heuresParJour` ÉCOLE : `{L:0, Ma:0, Me:0, J:0, V:0}` → `{L:7, Ma:7, Me:7, J:7, V:7}`

### 3. `src/hooks/useCreateFicheJourForAffectation.ts`
- `isEcole ? 0` → `isEcole ? 7`

### 4. `src/hooks/useAutoSaveFiche.ts`
- `isEcole ? [0,0,0,0,0]` → `isEcole ? [7,7,7,7,7]`

## Ce qui ne change PAS

| Champ | ÉCOLE (avant) | ÉCOLE (après) | Normal |
|-------|--------------|---------------|--------|
| heures L-V | 0 | **7** | 8/8/8/8/7 |
| total_heures | 0 | **35** | 39 |
| T (trajet) | 0 | 0 | 1 |
| PA (panier) | false | false | true |
| code_trajet | null | null | A_COMPLETER |
| repas_type | null | null | PANIER |

## Point retiré

~~Section chef principal + ÉCOLE~~ — Retiré car un chef ne sera jamais affecté au chantier ÉCOLE (chantier tampon apprentis).

## Régressions : aucune

- Panier, trajet, repas restent à 0/null/false pour ÉCOLE
- Le trigger `recalculate_fiche_total_heures` recalcule via SUM → cohérent avec 7h/jour
- La détection d'absence RH utilise `isEcole` → pas impactée
- Les exports PDF/Excel utilisent `isEcole` → pas impactés
- La protection des fiches (total_heures > 0) fonctionne mieux avec 35h qu'avec 0h

