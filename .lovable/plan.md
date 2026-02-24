

## Correction ChantierSelector — Planning comme unique source de vérité

### Analyse d'impact : 0 régression

Le composant `ChantierSelector` est utilisé à **2 endroits seulement** :

1. **`src/pages/Index.tsx` (ligne 497)** — Sélecteur principal de chantier du chef
   - Props : `chefId={selectedChef}` + `semaine={selectedWeek}`
   - **Impacté par la correction** : ne montrera que les chantiers du planning pour cette semaine
   - C'est exactement le comportement souhaité

2. **`src/components/timesheet/TimeEntryTable.tsx` (ligne 1277)** — Sélecteur de chantier par jour dans l'accordéon employé
   - Props : `chefId={undefined}` + `allowAll={true}` + **pas de `semaine`**
   - **Non impacté** : la condition `if (semaine && chefId)` est fausse → branche `else` → comportement identique à aujourd'hui

### Modification unique

**Fichier** : `src/components/timesheet/ChantierSelector.tsx`
**Lignes 116-134** : remplacer la fusion base+planning par une logique de priorité planning

```typescript
const chantiers = (() => {
  const planningList = chantiersPlanning || [];
  
  // Quand semaine + chefId sont fournis, le planning est l'unique source
  if (semaine && chefId) {
    return planningList.sort((a, b) => a.nom.localeCompare(b.nom));
  }
  
  // Sinon (conducteur, allowAll, pas de semaine) : source de base
  const baseList = chantiersBase || [];
  return baseList.sort((a, b) => a.nom.localeCompare(b.nom));
})();
```

### Pages non impactées (ne utilisent pas ChantierSelector)
- `/planning-main-oeuvre` — utilise son propre système d'accordéons par chantier
- `/validation-conducteur` — utilise `conducteurId` sans `semaine`
- `/consultation-rh` — n'utilise pas ce composant
- `/admin` — n'utilise pas ce composant
- `/signature-macons`, `/signature-finisseurs` — n'utilisent pas ce composant

### Résultat attendu
- DORAZIO en S09 → voit uniquement **SCHUMAN** (plus de CAPUCINES fantôme)
- Chefs mono-chantier → toujours leur unique chantier du planning
- Sélecteur par jour dans TimeEntryTable → inchangé (tous chantiers actifs)

