

## Fix : Recalculer `isAbsent` après fusion multi-chantier des chefs

### Problème identifié

Dans `useRHData.ts`, quand un chef a des fiches sur 2+ chantiers le même jour, la boucle de fusion (lignes 876-908) additionne correctement les heures mais conserve le `isAbsent` du premier enregistrement traité. Si celui-ci avait 0h (chantier secondaire), le jour reste marqué absent malgré les heures sommées.

**Impact** : dans la vue détail (sans filtre chantier), les jours apparaissent "Absent" à tort, faussant les compteurs paniers/trajets/absences des cartes semaine.

### Correction (1 seul fichier, 3 lignes ajoutées)

**Fichier** : `src/hooks/useRHData.ts`, dans le bloc `else` (sans filtre, lignes 987-997)

Après la résolution du `ficheJourId`, ajouter la recalculation de `isAbsent` :

```ts
// Existing: resolve ficheJourId to best entry
dayMap.forEach((jour) => {
  if (jour.allFicheJourIds.length > 1) {
    const bestEntry = [...jour.allFicheJourIds].sort((a, b) => b.heures - a.heures)[0];
    if (bestEntry) {
      jour.ficheJourId = bestEntry.id;
    }
  }
  // FIX: recalculer isAbsent après fusion des heures multi-chantier
  jour.isAbsent = jour.heuresNormales === 0 && jour.heuresIntemperies === 0 && !jour.isEcole;
});
```

### Analyse de régression

- **Chefs mono-chantier** : aucun impact, `isAbsent` est recalculé avec la même logique qu'à la ligne 828 initiale.
- **Chefs multi-chantier avec filtre** : non affecté, ce bloc est dans le `else` (sans filtre uniquement). Le bloc `if (activeChantierFilter)` gère déjà correctement `isAbsent`.
- **Non-chefs** : non affecté, ils passent par le bloc `else` à la ligne 1002 (déduplication classique).
- **Vue consolidée** : non affectée, elle utilise `rhShared.ts` (logique séparée déjà correcte).
- **Logique identique** : la formule `heuresNormales === 0 && heuresIntemperies === 0 && !isEcole` est exactement celle utilisée à la ligne 828 pour le calcul initial, donc aucun changement de comportement sauf la correction du bug.

**Risque de régression : nul.** C'est une recalculation du même flag avec la même formule, appliquée après la sommation au lieu d'avant.

