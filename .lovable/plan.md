
# Plan de Correction : Fiche de Trajet Conducteur - Menus Non Interactifs

## Problème Identifié

Après analyse du code, le problème est lié à **l'instabilité des références d'objets passées en props** qui provoque des re-renders excessifs et empêche les Popovers de s'ouvrir.

---

## Diagnostic Technique

### Cause Racine : Re-renders en Cascade

Dans `ValidationConducteur.tsx`, la ligne 815-827 :

```typescript
<TransportSheetWithFiche
  selectedWeek={parseISOWeek(selectedWeek)}  // ← PROBLÈME 1: Nouvel objet Date à chaque render
  finisseursEquipe={chantierFinisseurs.map(f => ({  // ← PROBLÈME 2: Nouveau tableau à chaque render
    id: f.id,
    nom: f.nom,
    prenom: f.prenom,
    ficheJours: f.ficheJours || []
  }))}
/>
```

**Problème 1** : `parseISOWeek(selectedWeek)` retourne un **nouvel objet Date** à chaque render. React considère que la prop a changé → re-render complet du composant.

**Problème 2** : `.map(f => ({...}))` crée un **nouveau tableau** à chaque render → même effet.

### Pourquoi ça fonctionne côté Chef ?

Côté chef (`Index.tsx`), le `TransportSheetV2` est placé **dans un Collapsible fermé par défaut** et le `ficheId` est récupéré au niveau du parent. Le composant ne se re-render pas à chaque changement de `timeEntries`.

Côté conducteur, le `TransportSheetWithFiche` est dans une **boucle `.map()`** qui s'exécute à chaque render du parent. Chaque appel à `setTimeEntries` (depuis `TimeEntryTable`) déclenche :
1. Re-render de `ValidationConducteur`
2. Re-exécution de la boucle `.map()`
3. Nouvelles références d'objets pour toutes les props
4. React démonte et remonte les composants enfants
5. Les Popovers perdent leur état `open`

---

## Solution Proposée

### Modification 1 : Mémoïser la Date

Utiliser `useMemo` pour stabiliser l'objet Date :

```typescript
// Dans ValidationConducteur.tsx
const selectedWeekDate = useMemo(() => parseISOWeek(selectedWeek), [selectedWeek]);
```

Puis passer `selectedWeekDate` au lieu de `parseISOWeek(selectedWeek)`.

### Modification 2 : Mémoïser les finisseursEquipe par chantier

Créer une Map mémoïsée pour les finisseurs formatés :

```typescript
const finisseursEquipeByChantier = useMemo(() => {
  const map = new Map<string, Array<{ id: string; nom: string; prenom: string; ficheJours: any[] }>>();
  
  finisseursByChantier.forEach((chantierFinisseurs, chantierId) => {
    map.set(chantierId, chantierFinisseurs.map(f => ({
      id: f.id,
      nom: f.nom,
      prenom: f.prenom,
      ficheJours: f.ficheJours || []
    })));
  });
  
  return map;
}, [finisseursByChantier]);
```

Puis utiliser `finisseursEquipeByChantier.get(chantierId)` dans le render.

### Modification 3 : Mémoïser le wrapper TransportSheetWithFiche

Transformer le composant en `React.memo` avec une comparaison personnalisée :

```typescript
const TransportSheetWithFiche = React.memo(({ ... }) => {
  // ... code existant
}, (prevProps, nextProps) => {
  // Comparer uniquement les valeurs importantes
  return prevProps.selectedWeekString === nextProps.selectedWeekString &&
         prevProps.chantierId === nextProps.chantierId &&
         prevProps.conducteurId === nextProps.conducteurId &&
         prevProps.isReadOnly === nextProps.isReadOnly;
});
```

---

## Fichiers à Modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/ValidationConducteur.tsx` | Ajouter useMemo pour Date + finisseursEquipe + React.memo sur le wrapper |

---

## Résultat Attendu

1. Les menus Immatriculation s'ouvriront au clic
2. Les menus Conducteur Matin/Soir s'ouvriront au clic  
3. L'effet hover orange sera visible
4. Aucun impact sur le fonctionnement côté chef

---

## Risque de Régression

**Très faible** :
- Les modifications sont uniquement des optimisations de performance
- Aucune logique métier n'est modifiée
- Le mode chef n'est pas impacté
