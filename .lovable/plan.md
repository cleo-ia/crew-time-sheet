

# Correction Simple : "VEHICULE_PERSO" comme Immatriculation

## Problème

Quand un finisseur utilise son véhicule personnel, l'immatriculation est laissée vide (`""`), ce qui fait échouer la validation car elle vérifie :
```typescript
const hasVehicle = !!jour.immatriculation && jour.immatriculation.trim() !== "";
```

## Solution

Stocker `"VEHICULE_PERSO"` comme immatriculation quand l'employé utilise son véhicule personnel. Ainsi la validation passe sans modification de sa logique.

## Modifications Techniques

### 1. TransportFinisseurAccordion.tsx - Initialisation

Quand `trajetPerso = true`, initialiser avec `"VEHICULE_PERSO"` au lieu de `""`.

**Fichier** : `src/components/transport/TransportFinisseurAccordion.tsx`

Lignes 100-109 - Modifier l'initialisation des jours :
```typescript
weekDays.map((date) => {
  const dateStr = format(date, "yyyy-MM-dd");
  const isTrajetPerso = trajetPersoByDate.get(dateStr) || false;
  return {
    date: dateStr,
    conducteurMatinId: finisseurId,
    conducteurSoirId: finisseurId,
    immatriculation: isTrajetPerso ? "VEHICULE_PERSO" : "",  // ✅ MODIFIÉ
    trajetPerso: isTrajetPerso,
  };
});
```

Ligne 135 - Modifier aussi la création de nouveaux jours dans l'effet :
```typescript
return {
  date: dateStr,
  conducteurMatinId: finisseurId,
  conducteurSoirId: finisseurId,
  immatriculation: trajetPersoByDate.get(dateStr) ? "VEHICULE_PERSO" : "",  // ✅ MODIFIÉ
  trajetPerso: trajetPersoByDate.get(dateStr) || false,
};
```

### 2. VehiculeCombobox.tsx - Affichage

Le composant affiche déjà "Véhicule personnel" quand la valeur est vide. On doit aussi gérer le cas `"VEHICULE_PERSO"`.

**Fichier** : `src/components/transport/VehiculeCombobox.tsx`

Ajouter la détection de `"VEHICULE_PERSO"` dans l'affichage du bouton trigger.

### 3. TransportFinisseurAccordion.tsx - Synchronisation trajet perso

Quand `trajetPerso` est coché dans les heures, s'assurer que l'immatriculation devient `"VEHICULE_PERSO"`.

L'affichage conditionnel (lignes 284-297) montre déjà "Véhicule personnel" quand `isTrajetPerso = true`. On doit juste s'assurer que les données sauvegardées ont bien `immatriculation = "VEHICULE_PERSO"`.

## Flux Simplifié

```text
Avant:
┌─────────────────────────────────────────────────────┐
│ Trajet Perso coché → immatriculation = ""          │
│ Validation → hasVehicle = false → ❌ ERREUR        │
└─────────────────────────────────────────────────────┘

Après:
┌─────────────────────────────────────────────────────┐
│ Trajet Perso coché → immatriculation = "VEHICULE_PERSO" │
│ Validation → hasVehicle = true → ✅ OK              │
└─────────────────────────────────────────────────────┘
```

## Fichiers Modifiés

1. `src/components/transport/TransportFinisseurAccordion.tsx` - Initialisation avec "VEHICULE_PERSO"
2. `src/components/transport/VehiculeCombobox.tsx` - Affichage "Véhicule personnel" pour valeur "VEHICULE_PERSO"

## Avantages

- **Simple** : Pas de modification de la logique de validation
- **Propre** : L'immatriculation a une vraie valeur explicite
- **Cohérent** : Traitement uniforme de toutes les immatriculations
- **Traçable** : On sait explicitement que c'est un véhicule perso en base

## Pas de Régression

- La validation reste identique
- L'affichage UI reste le même ("Véhicule personnel")
- Les autres cas (véhicule entreprise) ne sont pas impactés

