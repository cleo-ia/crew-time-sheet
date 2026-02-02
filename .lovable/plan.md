

# Correction du Bug : Chef sélectionnable comme conducteur malgré "Trajet Perso"

## Résumé du Problème

Quand le chef de chantier (Carlos GONCALVES) a coché **"Trajet Perso"** pour toute la semaine dans sa saisie d'heures, il ne devrait logiquement **plus être sélectionnable comme conducteur** dans la "Fiche de Trajet". 

Actuellement, il reste sélectionnable parce que le code exempte explicitement le chef de **toutes** les vérifications de statut, y compris celle du trajet personnel.

## Cause Technique

Dans `src/components/transport/ConducteurCombobox.tsx`, la fonction `getMaconStatus()` contient une exemption totale pour le chef :

```typescript
// Lignes 47-50 actuelles
if (chefId && macon.id === chefId) {
  return { isTrajetPerso: false, isDejaAffecte: false, isAbsent: false, isNotAffectedToday: false };
}
```

Cette exemption bypass la vérification de `trajet_perso` alors qu'elle devrait uniquement permettre au chef de rester sélectionnable par rapport aux affectations de jours.

## Solution Proposée

Modifier la logique d'exemption du chef pour :
1. **Garder** l'exemption pour `isNotAffectedToday` (le chef doit toujours rester sélectionnable pour les jours où il travaille)
2. **Supprimer** l'exemption pour `isTrajetPerso` (si le chef utilise sa voiture personnelle, il ne peut pas conduire un véhicule de société)

## Modification à Effectuer

**Fichier** : `src/components/transport/ConducteurCombobox.tsx`

**Avant (lignes 46-75)** :
```typescript
const getMaconStatus = (macon: MaconData) => {
  // Toujours autoriser le chef lui-même
  if (chefId && macon.id === chefId) {
    return { isTrajetPerso: false, isDejaAffecte: false, isAbsent: false, isNotAffectedToday: false };
  }
  
  // ... reste du code ...
}
```

**Après** :
```typescript
const getMaconStatus = (macon: MaconData) => {
  // Le chef est exempté UNIQUEMENT de la vérification d'affectation de jour
  // MAIS doit respecter les autres contraintes (trajet perso, absent, déjà affecté)
  const isChef = chefId && macon.id === chefId;

  // Vérifier si l'employé est affecté pour ce jour
  const hasAffectationToday = affectationsJoursChef?.some(
    aff => aff.macon_id === macon.id && aff.jour === date
  ) ?? true;
  
  // Si affectationsJoursChef existe et non vide mais l'employé n'a pas ce jour → bloqué
  // Exception : le chef est TOUJOURS considéré comme affecté (ne pas le bloquer sur ce critère)
  const isNotAffectedToday = !isChef && affectationsJoursChef && 
    affectationsJoursChef.length > 0 && 
    !hasAffectationToday;

  if (!macon.ficheJours || macon.ficheJours.length === 0) {
    return { isTrajetPerso: false, isDejaAffecte: false, isAbsent: false, isNotAffectedToday };
  }
  
  const jourData = macon.ficheJours.find((j) => j.date === date);
  if (!jourData) {
    return { isTrajetPerso: false, isDejaAffecte: false, isAbsent: false, isNotAffectedToday };
  }
  
  const isDejaAffecte = otherConducteursIds.includes(macon.id);
  // Le chef peut aussi être marqué absent, cette vérification doit aussi s'appliquer
  const isAbsent = Number(jourData.heures || 0) === 0;
  
  return { 
    isTrajetPerso: jourData.trajet_perso || jourData.code_trajet === "T_PERSO", 
    isDejaAffecte, 
    isAbsent, 
    isNotAffectedToday 
  };
};
```

## Comportement Attendu Après Correction

| Situation du Chef | Sélectionnable comme Conducteur ? |
|-------------------|-----------------------------------|
| Trajet normal (trajet classique T1-T17, GD) | ✅ Oui |
| **Trajet Perso** (voiture personnelle) | ❌ Non - Désactivé avec badge "(Trajet perso)" |
| Absent (0h le jour) | ❌ Non - Désactivé avec badge "(Absent)" |
| Non affecté ce jour (affectations_jours_chef) | ✅ Oui - Chef exempté de cette vérification |

## Impact

- **SDER** : Carlos GONCALVES ne pourra plus être sélectionné comme conducteur les jours où il a coché "Trajet Perso"
- **Limoge Revillon** : Même comportement pour tous les chefs qui utilisent leur véhicule personnel
- **Engo Bourgogne** : Idem

## Détails Techniques

La correction modifie uniquement la logique de vérification dans `ConducteurCombobox.tsx`. Elle ne nécessite aucune modification de base de données ni d'Edge Function.

Le hook `useMaconsByChantier.ts` récupère déjà correctement les données `ficheJours` avec le champ `trajet_perso` pour le chef (lignes 103-131). Le problème était uniquement dans l'interprétation de ces données côté UI.

