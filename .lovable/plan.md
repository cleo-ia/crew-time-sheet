

# Chef multi-chantier : valeurs par defaut a 0h sur chantier secondaire

## Objectif

Sur le chantier secondaire du chef, initialiser ses heures par defaut a **0h** avec panier et trajet **decoches** (au lieu de 8/8/8/8/7 avec panier + trajet). Le chef peut toujours modifier ces valeurs librement -- c'est juste un defaut plus safe pour eviter les erreurs.

**Important** : 0h sur un chantier secondaire ne doit PAS etre compte comme "absent" cote RH (deja gere par la correction rhShared.ts qui somme les heures multi-chantier).

## Modification unique : TimeEntryTable.tsx

### Ce qu'on fait

1. **Re-ajouter une query legere** pour recuperer le `chantier_principal_id` du chef (la meme qui existait avant, mais on ne l'utilise QUE pour les defauts, pas pour bloquer)

2. **Calculer `isChefOnSecondaryChantier`** : `true` si le chef a un chantier principal et que le chantier actuel n'est PAS le principal

3. **Modifier les valeurs par defaut** du chef sur le chantier secondaire dans le bloc `daysDefault` (lignes 487-493) :
   - Si c'est le chef ET c'est un chantier secondaire :
     - `hours: 0` (au lieu de 8/7)
     - `panierRepas: false` (au lieu de true)
     - `repasType: null` (au lieu de "PANIER")
     - `trajet: false` (au lieu de true)
     - `codeTrajet: null` (au lieu de "A_COMPLETER")
   - Sinon : comportement inchange (8/8/8/8/7 avec panier + trajet)

4. **Aucun blocage UI** : les champs restent editables. Le chef peut passer de 0 a 4h, cocher panier, etc.

## Ce qui ne change PAS

- Aucun blocage de saisie (les champs restent editables)
- Aucun message "lecture seule"
- Aucun style special bleu
- La consolidation RH (rhShared.ts) : deja corrigee pour sommer
- useAutoSaveFiche : deja corrige pour autoriser 5 jours partout
- SignatureMacons : deja nettoyee
- Chefs mono-chantier : pas affectes (la query retournera le meme chantierId)

## Technique

La query ajoutee est identique a celle qui existait avant (3 lignes Supabase), mais son resultat est utilise UNIQUEMENT dans le calcul des valeurs par defaut, jamais pour bloquer l'UI.
