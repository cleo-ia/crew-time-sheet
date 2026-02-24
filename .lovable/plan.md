

## Correction de `InterimairesManager.tsx` -- Retrait du legacy

Le fichier contient encore 3 résidus legacy :

1. **L13** : Import de `useAffectations, useCreateAffectation` depuis le hook legacy
2. **L28-33** : Hooks `chefs`, `chantiers`, `affectations`, `createAffectation` utilisés uniquement pour le dialog d'affectation legacy et le fallback
3. **L46-51** : Fonction `getAffectationForInterimaire` avec fallback vers la table legacy `affectations`
4. **L21-26** : State `showAffectDialog`, `affectTarget`, `affectForm` pour le dialog d'affectation legacy
5. **L127-140** : Bouton "Affecter" dans les actions (comme on l'a retiré pour Macons/Grutiers)
6. **L174-257** : Dialog d'affectation complet (utilise `createAffectation` legacy + `chantiers.chef_id`)
7. **L4** : Import `Mail` non utilisé

### Corrections

- Retirer les imports legacy (`useAffectations`, `useCreateAffectation`, `useChantiers`, `Mail`)
- Retirer les imports UI inutilisés (`Dialog*`, `Label`, `Select*`, `Input`, `useToast`)
- Retirer les state du dialog d'affectation (`showAffectDialog`, `affectTarget`, `affectForm`)
- Retirer les hooks legacy (`chefs`, `chantiers`, `affectations`, `createAffectation`, `toast`)
- Simplifier `getAffectationForInterimaire` : retourner uniquement `planningAffectations[id]` sans fallback
- Retirer le bouton "Affecter" de la colonne Actions
- Retirer tout le dialog d'affectation (L174-257)
- Simplifier l'affichage de l'affectation (plus besoin du double check `'chantier_nom' in affectation`)

Résultat : le composant n'utilisera plus que `usePlanningAffectationsCurrentWeek` pour l'affichage, aligné avec les autres panels admin.

