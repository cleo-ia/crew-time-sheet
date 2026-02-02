
# Correction : Auto-save conducteur utilisant la mauvaise table d'affectations

## ✅ IMPLÉMENTÉ

### Modifications effectuées

#### 1. `src/hooks/useAutoSaveFiche.ts`
- Ajout du paramètre `mode?: "chef" | "conducteur"` à l'interface `SaveFicheParams`
- Nouvelle branche de logique pour le mode conducteur qui utilise `affectations_finisseurs_jours` au lieu de `affectations_jours_chef`

#### 2. `src/components/timesheet/TimeEntryTable.tsx`
- Passage du paramètre `mode: isConducteurMode ? "conducteur" : "chef"` dans les deux appels à `autoSaveMutation.mutate`:
  - Ligne 879 (debounce auto-save)
  - Ligne 902 (visibility change / pagehide)

### Comportement après correction

```text
Mode conducteur :
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. Conducteur modifie les heures (39h → 40h)                            │
│ 2. Auto-save déclenché avec mode = "conducteur"                         │
│ 3. Requête vers affectations_finisseurs_jours                           │
│    → Retourne les jours affectés (Lundi-Vendredi)                       │
│ 4. Upsert fiches_jours avec les nouvelles heures                        │
│ 5. Refresh → données correctement restaurées (40h)                      │
└──────────────────────────────────────────────────────────────────────────┘

Mode chef (inchangé) :
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. Chef modifie les heures d'un maçon                                   │
│ 2. Auto-save déclenché avec mode = "chef" (ou undefined)                │
│ 3. Requête vers affectations_jours_chef (comme avant)                   │
│ 4. Upsert fiches_jours avec les nouvelles heures                        │
│ 5. Refresh → données correctement restaurées                            │
└──────────────────────────────────────────────────────────────────────────┘
```

## Tests à effectuer

### Test principal (correction du bug)

1. Aller sur `/validation-conducteur?tab=mes-heures&semaine=2026-S07`
2. Modifier les heures d'un finisseur (ex: José AMARAL, lundi 8h → 9h)
3. Attendre 2 secondes (debounce auto-save)
4. Vérifier dans le réseau une requête d'écriture vers `fiches_jours`
5. Refresh (F5)
6. Confirmer que le total reste à 40h et lundi est à 9h

### Test de non-régression (chef)

1. Aller sur `/` (page saisie chef)
2. Sélectionner un chantier et une semaine
3. Modifier les heures d'un maçon
4. Attendre 2 secondes
5. Refresh (F5)
6. Confirmer que les heures sont bien sauvegardées
