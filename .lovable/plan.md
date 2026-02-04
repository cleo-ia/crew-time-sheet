
# Plan : Supprimer l'ancien système de fiche trajet individuel côté conducteur

## Problème identifié

Actuellement, **les deux systèmes de fiche trajet s'affichent en même temps** :

| Système | Emplacement | Composant |
|---------|-------------|-----------|
| **Ancien** (à supprimer) | À l'intérieur de chaque accordéon employé dans TimeEntryTable | `TransportFinisseurAccordion` |
| **Nouveau** (à garder) | Après le tableau des heures dans ValidationConducteur | `TransportSheetV2` |

## Solution

Supprimer le bloc qui affiche l'ancien accordéon "Fiche trajet" dans `TimeEntryTable.tsx` pour le mode conducteur.

## Modification technique

**Fichier : `src/components/timesheet/TimeEntryTable.tsx`**

Supprimer le bloc lignes 1743-1788 :
```tsx
{/* Fiche trajet pour les finisseurs (mode conducteur uniquement) */}
{isConducteurMode && chefId && (
  <div className="px-4 pb-4 mt-3">
    <Accordion type="single" collapsible className="w-full">
      ...
      <TransportFinisseurAccordion ... />
      ...
    </Accordion>
  </div>
)}
```

## Nettoyage complémentaire

Après cette suppression, les éléments suivants deviendront du code mort et pourront être nettoyés :

1. **Import** : `import { TransportFinisseurAccordion }` (ligne 28)
2. **États inutilisés** : 
   - `transportFinisseurData` 
   - `handleTransportFinisseurUpdate`
   - `localVehiculeUsage`
3. **Fichiers obsolètes** (à archiver plus tard) :
   - `src/components/transport/TransportFinisseurAccordion.tsx`
   - `src/hooks/useTransportDataFinisseur.ts`
   - `src/hooks/useSaveTransportFinisseur.ts`
   - `src/hooks/useAutoSaveTransportFinisseur.ts`

## Résultat attendu

Après cette modification, les conducteurs ne verront plus que la **fiche trajet équipe** (modèle chef) sous chaque tableau de saisie, sans les anciens accordéons individuels par finisseur.
