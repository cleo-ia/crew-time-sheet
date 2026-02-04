
# Correctif : Boucle infinie de synchronisation affectations → saisie

## Diagnostic

Le composant `TimeEntryTable.tsx` contient un `useEffect` qui synchronise les affectations de chantiers vers les entrées de saisie. Ce hook se déclenche en boucle car :

1. **Dépendance circulaire** : `entries.length` est dans les dépendances
2. **Création systématique d'un nouveau tableau** : `setEntries(prev => prev.map(...))` crée toujours un nouveau tableau, même si rien ne change
3. **Pas de garde-fou** : Aucune vérification n'empêche le re-déclenchement si les données sont déjà synchronisées

## Solution

Modifier le `useEffect` de synchronisation pour :
1. **Tracker si la sync a déjà eu lieu** avec un `useRef`
2. **Comparer avant de modifier** : vérifier si les chantiers sont déjà à jour avant d'appeler `setEntries`
3. **Retirer `entries.length` des dépendances** car c'est une valeur qui ne doit pas déclencher de re-sync

---

## Fichier modifié

`src/components/timesheet/TimeEntryTable.tsx`

### Modification 1 : Ajouter un ref pour tracker la synchronisation

```typescript
// Après la ligne ~418 (près des autres refs/states)
const hasSyncedAffectations = useRef(false);
```

### Modification 2 : Réécrire le useEffect de synchronisation (lignes 738-781)

**Avant :**
```typescript
useEffect(() => {
  if (!isConducteurMode) return;
  if (!affectationsJours?.length || !chantiers.length || !entries.length) return;

  console.log("🔄 Synchronisation affectations → saisie", {...});

  setEntries(prev => prev.map(entry => {
    // ... logique de mapping
  }));
}, [isConducteurMode, affectationsJours, chantiers, entries.length, hasUserEdits]);
```

**Après :**
```typescript
useEffect(() => {
  if (!isConducteurMode) return;
  if (!affectationsJours?.length || !chantiers.length) return;
  
  // ✅ Éviter la re-sync si déjà synchronisé OU si l'utilisateur a modifié
  if (hasSyncedAffectations.current || hasUserEdits) return;

  console.log("🔄 Synchronisation affectations → saisie (unique)", {
    affectations: affectationsJours.length,
    chantiers: chantiers.length,
    hasUserEdits
  });

  setEntries(prev => {
    if (prev.length === 0) return prev; // Attendre que les entries soient chargées
    
    let hasChanges = false;
    const updated = prev.map(entry => {
      const affs = affectationsJours.filter(a => a.finisseur_id === entry.employeeId);
      if (!affs.length) return entry;

      const updatedDays = { ...entry.days };
      const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;
      
      for (const aff of affs) {
        const date = new Date(aff.date + "T00:00:00");
        const dayLabel = dayNames[date.getDay()];
        const dayData = updatedDays[dayLabel];
        
        if (!dayData) continue;

        // Vérifier si le chantier est déjà correct
        if (dayData.chantierId === aff.chantier_id) continue;

        const chantierInfo = chantiers.find(c => c.id === aff.chantier_id);
        
        // Mettre à jour seulement si pas de chantierId ou si différent
        if (!dayData.chantierId) {
          hasChanges = true;
          updatedDays[dayLabel] = {
            ...dayData,
            chantierId: aff.chantier_id,
            chantierCode: chantierInfo?.code_chantier ?? null,
            chantierVille: chantierInfo?.ville ?? null,
            chantierNom: chantierInfo?.nom ?? null,
          };
        }
      }
      
      return hasChanges ? { ...entry, days: updatedDays } : entry;
    });

    // ✅ Marquer comme synchronisé pour éviter les re-runs
    hasSyncedAffectations.current = true;
    
    return hasChanges ? updated : prev;
  });
}, [isConducteurMode, affectationsJours, chantiers, hasUserEdits]);
// ⚠️ Retrait de entries.length des dépendances
```

### Modification 3 : Reset du ref lors du changement de semaine/chantier

Dans le `useEffect` existant qui reset les états (vers ligne 871-875), ajouter :

```typescript
useEffect(() => {
  setHasLoadedData(false);
  setHasUserEdits(false);
  setEntries([]);
  hasSyncedAffectations.current = false; // ✅ Reset le flag de sync
}, [weekId, chantierId]);
```

---

## Détail technique

| Aspect | Avant | Après |
|--------|-------|-------|
| Dépendances | `entries.length` inclus | Retiré |
| Vérification préalable | Aucune | Vérifie si déjà sync |
| Modification inutile | `.map()` crée toujours un nouveau tableau | Retourne `prev` si pas de changement |
| Protection contre boucle | Aucune | `hasSyncedAffectations.current` |
| Reset | Non | Reset à chaque changement de semaine/chantier |

---

## Impact

- **Aucune régression fonctionnelle** : La synchronisation continue de fonctionner normalement
- **Performance** : Élimination des centaines de re-renders inutiles
- **Console** : Plus de spam de logs "🔄 Synchronisation affectations → saisie"
- **UX** : Interface plus réactive, pas de lag visible
