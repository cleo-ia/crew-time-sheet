
## ✅ IMPLÉMENTÉ - Correction de la disparition de l'équipe conducteur

### Problème diagnostiqué
L'équipe conducteur disparaissait au retour sur l'onglet "Mes heures" à cause de 2 effets qui interagissaient mal avec le nouveau cache (staleTime 30s) :

1. **Reset au remontage** : L'effet `[weekId, chantierId]` vidait `entries` au simple remontage
2. **Filtrage agressif** : L'effet de filtrage supprimait les finisseurs quand `affectationsJours` était temporairement `[]`

### Corrections appliquées (TimeEntryTable.tsx)

1. **✅ Reset intelligent (lignes 893-919)**
   - Ajout de `prevWeekId` et `prevChantierId` useRefs
   - Reset uniquement si les valeurs ont VRAIMENT changé (pas au remontage)

2. **✅ Garde sur le filtrage (lignes 880-891)**
   - Ne plus filtrer si `affectationsJours` est `undefined` ou `[]`
   - Évite de supprimer tout le monde pendant les phases de chargement

3. **✅ Suppression de l'effet "Re-trigger" inutile (ligne 799)**
   - Cet effet ne faisait que logger sans corriger quoi que ce soit

### Test de validation
1. Aller sur `/validation-conducteur?tab=mes-heures` avec une équipe
2. Passer sur l'onglet "Validation des fiches"
3. Revenir sur "Mes heures" → l'équipe doit toujours être là
4. Changer de semaine → doit reset et recharger correctement
