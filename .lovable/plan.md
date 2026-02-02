
# Plan : Autoriser les chefs multi-chantiers le même jour

## Contexte du problème

Actuellement, quand un employé est affecté à un chantier sur un jour donné, ce jour est marqué comme "pris" et la checkbox est désactivée pour l'empêcher d'être ajouté sur un autre chantier le même jour.

Ce comportement est correct pour les **maçons, finisseurs, grutiers** (un seul chantier par jour), mais **incorrect pour les chefs** qui doivent pouvoir superviser plusieurs chantiers le même jour.

**Capture d'écran fournie** : FAY Philippe est sur CI229BALME avec badge "Principal", mais quand on essaie de l'ajouter sur un autre chantier, tous les jours sont grisés/désactivés car déjà "pris".

## Solution proposée

Modifier la logique de détection des "jours pris" pour **exclure les chefs** de cette restriction.

## Fichier à modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/planning/AddEmployeeToPlanningDialog.tsx` | Exempter les chefs de la restriction des jours pris |

## Implémentation détaillée

### Modification du calcul de `daysTakenByEmploye` (lignes 76-87)

**Code actuel** :
```typescript
const daysTakenByEmploye = useMemo(() => {
  const map = new Map<string, Set<string>>();
  allAffectations.forEach(aff => {
    if (aff.chantier_id !== chantierId) {
      if (!map.has(aff.employe_id)) {
        map.set(aff.employe_id, new Set());
      }
      map.get(aff.employe_id)!.add(aff.jour);
    }
  });
  return map;
}, [allAffectations, chantierId]);
```

**Code modifié** :
```typescript
// Créer une map des chefs pour vérification rapide
const chefIds = useMemo(() => {
  return new Set(
    allEmployes
      .filter(emp => getEmployeType(emp) === "chef")
      .map(emp => emp.id)
  );
}, [allEmployes]);

// Jours déjà pris par chaque employé (sur d'autres chantiers)
// EXCEPTION : Les chefs ne sont jamais bloqués car ils peuvent être multi-chantiers
const daysTakenByEmploye = useMemo(() => {
  const map = new Map<string, Set<string>>();
  allAffectations.forEach(aff => {
    // Les chefs peuvent être sur plusieurs chantiers le même jour
    if (chefIds.has(aff.employe_id)) return;
    
    if (aff.chantier_id !== chantierId) {
      if (!map.has(aff.employe_id)) {
        map.set(aff.employe_id, new Set());
      }
      map.get(aff.employe_id)!.add(aff.jour);
    }
  });
  return map;
}, [allAffectations, chantierId, chefIds]);
```

## Comportement après modification

| Scénario | Avant | Après |
|----------|-------|-------|
| Chef sur chantier A, ajouter sur chantier B | Jours grisés ❌ | Jours sélectionnables ✅ |
| Maçon sur chantier A, ajouter sur chantier B | Jours grisés ✅ | Jours grisés ✅ (inchangé) |
| Finisseur sur chantier A, ajouter sur chantier B | Jours grisés ✅ | Jours grisés ✅ (inchangé) |

## Impact sur FAY Philippe

Après cette modification :
1. FAY Philippe reste sur CI229BALME avec badge "Principal ★"
2. On peut l'ajouter sur CI230ROSEYRAN avec tous les jours sélectionnables
3. Sur le 2ème chantier, il aura le badge "Secondaire"

## Résumé des changements

```text
src/components/planning/AddEmployeeToPlanningDialog.tsx
├─ Ajouter un useMemo pour identifier les chefs (chefIds)
└─ Modifier daysTakenByEmploye pour exclure les chefs du blocage
```
