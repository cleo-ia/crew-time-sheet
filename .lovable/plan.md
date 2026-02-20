
# Suppression du bouton "Copier S-1" côté conducteur (finisseurs)

## Constat après lecture du code

Le bouton "Copier S-1" finisseurs n'existe **pas** dans le JSX de `FinisseursDispatchWeekly.tsx`. Le hook `useCopyPreviousWeekFinisseurs` est importé et instancié (ligne 44 et 102), mais **`copyMutation` n'est appelé nulle part dans le rendu**. C'est du code mort.

La seule trace visible est un **texte d'aide** dans `ValidationConducteur.tsx` ligne 968, qui dit au conducteur "Cliquez sur Copier S-1" alors que ce bouton n'existe plus depuis un refactor précédent.

## Ce qui doit être supprimé / nettoyé

### Fichier 1 : `src/components/conducteur/FinisseursDispatchWeekly.tsx`

- **Ligne 44** : supprimer l'import `useCopyPreviousWeekFinisseurs`
- **Ligne 102** : supprimer la ligne `const copyMutation = useCopyPreviousWeekFinisseurs();`
- Aucun autre impact — `copyMutation` n'est référencé nulle part ailleurs dans ce fichier

### Fichier 2 : `src/pages/ValidationConducteur.tsx`

- **Ligne 968** : remplacer le texte d'aide obsolète qui mentionne "Copier S-1" par un message cohérent avec le flux actuel (planning → sync lundi)

Nouveau texte suggéré :
```
Le planning de votre équipe est géré depuis la page Planning. 
La synchronisation automatique du lundi matin initialise votre semaine.
```

## Ce qui n'est PAS touché

- Le hook `useCopyPreviousWeekFinisseurs.ts` lui-même : le fichier peut rester (il ne cause aucun problème s'il n'est pas importé), mais on peut aussi le supprimer pour faire le ménage complet
- Le bouton "Copier S-1" de la **fiche de trajet** (`TransportSheetV2`) : complètement différent, il reste en place — c'est la copie du transport (véhicules), pas des affectations équipe
- Le bouton "Copier S-1" du **planning main d'oeuvre** (`PlanningMainOeuvre.tsx`) : complètement différent, il reste en place — c'est la copie du planning planning conducteur
- Aucune page frontend autre que les deux citées n'est impactée

## Garantie de non-régression

- Aucune fonctionnalité n'est perdue : le bouton n'existait déjà plus visuellement
- Le texte d'aide mis à jour sera plus clair pour les conducteurs
- Le nettoyage des imports réduit le bundle légèrement

## Fichiers modifiés

1. `src/components/conducteur/FinisseursDispatchWeekly.tsx` — suppression import + instanciation du hook mort
2. `src/pages/ValidationConducteur.tsx` — mise à jour du texte d'aide dans la carte vide

Optionnel (ménage) : suppression du fichier `src/hooks/useCopyPreviousWeekFinisseurs.ts` devenu inutilisé.
