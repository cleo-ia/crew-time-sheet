

# Plan : Corriger les sélecteurs de véhicule et conducteur dans la fiche trajet conducteur

## Diagnostic confirmé

Après analyse comparative entre le mode chef et le mode conducteur :

### Ce qui fonctionne (chef)
- Dans `TransportDayAccordion`, quand un `conducteurId` est passé ET `mode === "chef"`, les champs "Conducteur Matin/Soir" affichent un **texte statique** (lignes 287-305)
- Les `ConducteurCombobox` ne sont **jamais rendus** côté chef
- Seul le `VehiculeCombobox` est utilisé, et même s'il a `modal={true}`, il fonctionne car le contexte parent est un `Collapsible` simple

### Ce qui ne fonctionne pas (conducteur)
- En mode conducteur (`mode === "conducteur"`), les 3 combobox (`VehiculeCombobox`, 2x `ConducteurCombobox`) sont rendus **à l'intérieur d'un `AccordionContent`**
- Ces combobox utilisent `<Popover modal={true}>` qui crée un overlay modal
- Le focus management du `Popover` modal entre en **conflit** avec le `Accordion` de Radix
- Résultat : le clic ouvre le popover puis le ferme instantanément (effet "flash")

### Pattern qui fonctionne
- `PlanningVehiculeCombobox` : utilise `<Popover open={open} onOpenChange={setOpen}>` **sans `modal`** → fonctionne parfaitement

---

## Corrections à appliquer

### 1. VehiculeCombobox.tsx

**Ligne 117** : Retirer `modal={true}` du Popover

```text
Avant :
<Popover open={open} onOpenChange={setOpen} modal={true}>

Après :
<Popover open={open} onOpenChange={setOpen}>
```

### 2. ConducteurCombobox.tsx

**Ligne 91** : Retirer `modal={true}` du Popover

```text
Avant :
<Popover open={open} onOpenChange={setOpen} modal={true}>

Après :
<Popover open={open} onOpenChange={setOpen}>
```

---

## Impact

| Composant | Contexte d'usage | Avant | Après |
|-----------|------------------|-------|-------|
| VehiculeCombobox | Accordion (conducteur) | ❌ Flash/ferme | ✅ Fonctionne |
| VehiculeCombobox | Collapsible (chef) | ✅ OK | ✅ OK |
| ConducteurCombobox | Accordion (conducteur) | ❌ Flash/ferme | ✅ Fonctionne |
| ConducteurCombobox | Table (chef/old) | ✅ OK | ✅ OK |

Cette correction aligne le comportement sur `PlanningVehiculeCombobox` qui fonctionne déjà.

---

## Garantie de non-régression

- Le mode non-modal est le comportement par défaut de Radix Popover
- Il n'y a aucune raison métier d'avoir un modal ici (pas besoin de bloquer les clics ailleurs)
- Les autres combobox du projet (`PlanningVehiculeCombobox`, `AgenceInterimCombobox`, etc.) fonctionnent tous sans `modal`

