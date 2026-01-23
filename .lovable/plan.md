

# Plan de correction : Exclusivité Trajet / Trajet Perso / GD au chargement

## Problème identifié

La logique d'interaction (quand l'utilisateur coche/décoche) fonctionne correctement. Le problème vient uniquement du **chargement des données** qui ne respecte pas l'exclusivité.

### Code actuel (problématique)

```typescript
// Lignes 456-458, 567-569, 645-647
const rawT = j.T;
const trajet = rawT === null || rawT === undefined || rawT === 0 ? true : Boolean(rawT);
// ... puis plus loin :
trajetPerso: !!j.trajet_perso || j.code_trajet === "T_PERSO",
grandDeplacement: (j as any).code_trajet === "GD",
```

Ce code peut produire `trajet=true` ET `trajetPerso=true` simultanément.

## Solution

Calculer d'abord `trajetPerso` et `grandDeplacement`, puis déduire `trajet` par exclusion.

### Fichier modifié : src/components/timesheet/TimeEntryTable.tsx

**Correction à 3 endroits** (lignes 456-458, 567-569, 645-647)

```
AVANT (lignes 456-458):
// Trajet: true par défaut si valeur absente, sinon utiliser la valeur réelle
const rawT = j.T;
const trajet = rawT === null || rawT === undefined || rawT === 0 ? true : Boolean(rawT);

APRÈS:
// Calculer d'abord les options exclusives
const isTrajetPerso = !!j.trajet_perso || j.code_trajet === "T_PERSO";
const isGD = j.code_trajet === "GD";
// Trajet = true par défaut SAUF si Trajet Perso ou GD est actif (exclusivité)
const trajet = (isTrajetPerso || isGD) ? false : true;
```

**Même correction aux lignes 567-569 et 645-647.**

## Règle d'exclusivité appliquée

| Données en BDD | trajet | trajetPerso | GD |
|----------------|--------|-------------|-----|
| code_trajet = "T_PERSO" | false | true | false |
| code_trajet = "GD" | false | false | true |
| code_trajet = "A_COMPLETER" ou autre | true | false | false |

## Comportement attendu après correction

1. Saisir "Trajet Perso" pour Philippe ROUX toute la semaine
2. L'auto-save envoie `trajet_perso=true` et `code_trajet="T_PERSO"`
3. Actualiser la page
4. Au chargement : `isTrajetPerso=true` donc `trajet=false`
5. Résultat : seule la case "Trajet Perso" est cochée

## Détails techniques

### Emplacements des modifications

| Lignes | Contexte |
|--------|----------|
| 456-458 | Chargement finisseursData (mode conducteur) |
| 567-569 | Chargement macons (mode chef) |
| 645-647 | Ajout dynamique finisseur |

### Impact

- Aucun nouveau champ
- Aucune modification de la base de données
- La logique d'interaction existante reste inchangée
- Compatible avec les données existantes

