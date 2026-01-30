

# Correction complète : Affectations jours obligatoires + Mode legacy

## Problème confirmé

Le code actuel dans `ChefMaconsManager.tsx` (lignes 298-328) contient cette logique :

```typescript
if (isPlanningActive) {
  // Créer les affectations jours...
} else {
  console.log("Mode legacy - pas de création affectations_jours_chef");
}
```

Cette logique empêche la création des entrées `affectations_jours_chef` quand le planning n'est pas validé, ce qui cause :
- 10 membres de l'équipe de Jérôme sans entrées dans la table
- Le `ConducteurCombobox` qui les bloque car il détecte des entrées existantes (Zanga) mais pas pour eux

## Solution complète (2 corrections)

### 1. Correction ChefMaconsManager.tsx - TOUJOURS créer les affectations jours

**Fichier** : `src/components/chef/ChefMaconsManager.tsx`

**Supprimer la condition `if (isPlanningActive)`** (lignes 298-328) et TOUJOURS créer les affectations jours :

```typescript
// AVANT (lignes 298-328)
if (isPlanningActive) {
  if (status.type === "partial" && status.availableDays) {
    await updateJoursForMember.mutateAsync({...});
  } else {
    await createDefaultAffectationsJours.mutateAsync({...});
  }
} else {
  console.log("[ChefMaconsManager] Mode legacy - pas de création...");
}

// APRÈS - TOUJOURS créer les jours
if (status.type === "partial" && status.availableDays) {
  console.log("[ChefMaconsManager] Création jours partiels pour", { maconId, availableDays: status.availableDays });
  await updateJoursForMember.mutateAsync({
    maconId,
    chefId,
    chantierId,
    semaine,
    affectationId,
    entrepriseId,
    selectedDays: status.availableDays,
  });
} else {
  console.log("[ChefMaconsManager] Création jours complets (Lun-Ven) pour", { maconId, chefId, semaine, entrepriseId });
  await createDefaultAffectationsJours.mutateAsync({
    maconId,
    chefId,
    chantierId,
    semaine,
    affectationId,
    entrepriseId,
  });
}
```

**Supprimer également l'import et l'utilisation de `usePlanningMode`** (ligne 25 et 53) car il n'est plus nécessaire dans ce composant.

### 2. Correction TransportDayAccordion.tsx - Ignorer les jours en mode legacy

**Fichier** : `src/components/transport/TransportDayAccordion.tsx`

Même si on corrige le ChefMaconsManager, il faut aussi sécuriser le comportement du combobox pour les données existantes incohérentes :

```typescript
// AJOUTER l'import (ligne 1)
import { usePlanningMode } from "@/hooks/usePlanningMode";

// APRÈS ligne 73, modifier la logique
const { isActive: isPlanningActive } = usePlanningMode(semaine);
const { data: rawAffectationsJoursChef = [] } = useAffectationsJoursByChef(chefId, semaine);

// En mode legacy, ignorer les affectations journalières pour éviter les blocages
const affectationsJoursChef = isPlanningActive ? rawAffectationsJoursChef : [];
```

### 3. Nettoyage des données existantes (SQL manuel optionnel)

Pour réparer les 10 membres existants de Jérôme qui n'ont pas d'entrées, tu pourras exécuter un script SQL après validation du code.

## Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `src/components/chef/ChefMaconsManager.tsx` | Supprimer condition `if (isPlanningActive)`, toujours créer les jours |
| `src/components/transport/TransportDayAccordion.tsx` | Ajouter `usePlanningMode`, ignorer jours en legacy |

## Résultat attendu

1. **Nouveaux ajouts** : Tout employé ajouté à l'équipe d'un chef aura automatiquement ses 5 jours (Lun-Ven) créés dans `affectations_jours_chef`
2. **Sélection conducteur** : En mode legacy, le combobox ignorera la vérification des jours et autorisera tous les membres de l'équipe
3. **Pas de régression** : Le comportement reste identique en mode planning actif

## Section technique

### Flux après correction

```text
Chef clique "Ajouter" un employé
        │
        ▼
┌───────────────────────────────────────┐
│  1. Création/réactivation affectation │
│     (table: affectations)             │
├───────────────────────────────────────┤
│  2. TOUJOURS créer les jours Lun-Ven  │
│     (table: affectations_jours_chef)  │
│     ✓ Mode legacy = OUI              │
│     ✓ Mode planning = OUI            │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│  Sélection conducteur (Combobox)      │
├───────────────────────────────────────┤
│  Si planning NON validé :             │
│    → Ignorer affectations_jours_chef  │
│    → Tous les membres sélectionnables │
│                                       │
│  Si planning validé :                 │
│    → Vérifier les jours affectés      │
│    → Bloquer si non affecté ce jour   │
└───────────────────────────────────────┘
```

