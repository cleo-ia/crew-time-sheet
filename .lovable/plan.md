
# Correction : Auto-save conducteur utilisant la mauvaise table d'affectations

## Diagnostic confirmé

Sur `/validation-conducteur?tab=mes-heures`, les heures saisies ne persistent pas après refresh car l'auto-save utilise la **mauvaise table d'affectations**.

### Flux actuel (bug)

1. Conducteur modifie les heures d'un finisseur
2. `TimeEntryTable` déclenche `autoSaveMutation.mutate({ timeEntries, weekId, chantierId, chefId })`
3. `useAutoSaveFiche` voit `chantierId !== null` et cherche les jours autorisés dans `affectations_jours_chef`
4. Cette table retourne `[]` car les finisseurs ne sont pas des maçons gérés par des chefs
5. `selectedDays = []` → aucun `fiches_jours` n'est écrit
6. Refresh → les données reviennent aux valeurs initiales

### Cause racine

Le paramètre `mode` défini dans les props de `TimeEntryTable` n'est **jamais transmis** à l'auto-save.

## Solution

### 1. Modifier l'interface de `useAutoSaveFiche`

Ajouter le paramètre `mode` pour distinguer chef/conducteur :

```typescript
interface SaveFicheParams {
  timeEntries: TimeEntry[];
  weekId: string;
  chantierId: string | null;
  chefId: string;
  forceNormalize?: boolean;
  mode?: "chef" | "conducteur";  // ← NOUVEAU
}
```

### 2. Brancher la logique conducteur dans `useAutoSaveFiche.ts`

À la ligne 262, ajouter une branche spécifique pour le mode conducteur :

```typescript
if (chantierId !== null) {
  const isConducteurMode = params.mode === "conducteur";
  
  if (isConducteurMode) {
    // MODE CONDUCTEUR : utiliser affectations_finisseurs_jours
    const { data: affectationsFinisseurs } = await supabase
      .from("affectations_finisseurs_jours")
      .select("date")
      .eq("finisseur_id", entry.employeeId)
      .eq("conducteur_id", chefId)
      .eq("chantier_id", chantierId)
      .eq("semaine", weekId);
    
    if (affectationsFinisseurs && affectationsFinisseurs.length > 0) {
      const assignedDayNames = affectationsFinisseurs
        .map(a => dayNameByDate[a.date])
        .filter(Boolean);
      selectedDays = assignedDayNames;
    } else {
      selectedDays = [];
    }
  } else {
    // MODE CHEF : utiliser affectations_jours_chef (code existant)
    // ...
  }
}
```

### 3. Passer `mode` dans les appels auto-save de `TimeEntryTable.tsx`

Modifier les 3 appels à `autoSaveMutation.mutate` (lignes 879, 902, 912) :

```typescript
autoSaveMutation.mutate({ 
  timeEntries: entries, 
  weekId, 
  chantierId, 
  chefId,
  mode: isConducteurMode ? "conducteur" : "chef"  // ← AJOUT
});
```

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useAutoSaveFiche.ts` | Ajouter param `mode` + branche conducteur avec `affectations_finisseurs_jours` |
| `src/components/timesheet/TimeEntryTable.tsx` | Passer `mode` aux 3 appels d'auto-save |

## Analyse de non-régression

### Page `/` (saisie chef - maçons)

| Élément | Impact |
|---------|--------|
| Appel `TimeEntryTable` | `mode` non passé → défaut `"create"` |
| Auto-save | `mode` sera `undefined` ou `"chef"` → **branche existante** |
| Table utilisée | `affectations_jours_chef` → **INCHANGÉ** |
| Résultat | ✅ **Aucune régression** |

### Page `/validation-conducteur` (finisseurs)

| Élément | Impact |
|---------|--------|
| Appel `TimeEntryTable` | `mode="conducteur"` déjà passé |
| Auto-save | `mode = "conducteur"` → **nouvelle branche** |
| Table utilisée | `affectations_finisseurs_jours` → **CORRIGÉ** |
| Résultat | ✅ **Bug corrigé** |

### Page FicheDetail (édition admin/RH)

| Élément | Impact |
|---------|--------|
| Appel `TimeEntryTable` | `mode="edit"` |
| Auto-save interne | Non utilisé (sauvegarde manuelle via `useSaveFicheJours`) |
| Résultat | ✅ **Aucune régression** |

## Comportement attendu après correction

```text
Nouveau flux (mode conducteur) :
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. Conducteur modifie les heures (39h → 40h)                            │
│ 2. Auto-save déclenché avec mode = "conducteur"                         │
│ 3. Requête vers affectations_finisseurs_jours                           │
│    → Retourne les jours affectés (Lundi-Vendredi)                       │
│ 4. Upsert fiches_jours avec les nouvelles heures                        │
│ 5. Refresh → données correctement restaurées (40h)                      │
└──────────────────────────────────────────────────────────────────────────┘

Flux chef (inchangé) :
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. Chef modifie les heures d'un maçon                                   │
│ 2. Auto-save déclenché avec mode = "chef" (ou undefined)                │
│ 3. Requête vers affectations_jours_chef (comme avant)                   │
│ 4. Upsert fiches_jours avec les nouvelles heures                        │
│ 5. Refresh → données correctement restaurées                            │
└──────────────────────────────────────────────────────────────────────────┘
```

## Tests à effectuer après implémentation

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
