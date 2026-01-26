

# Plan : Rendre la colonne "Base horaire" non éditable dans le pré-export

## Problème identifié

La colonne "Base horaire" est actuellement éditable dans le pré-export Excel, alors qu'il s'agit d'une **donnée contractuelle** qui ne doit pas être modifiable à cet endroit (elle doit être modifiée uniquement dans la fiche employé).

---

## Cause technique

La fonction `isEditableColumn` (ligne 445) définit les colonnes en lecture seule via un tableau `nonEditable`, mais **`baseHoraire`** n'y figure pas :

```typescript
const nonEditable = ["echelon", "niveau", "degre", "statut", "libelleEmploi", 
                     "typeContrat", "horaire", "heuresSuppMensualisees", 
                     "forfaitJours", "heuresReelles", "salaire"];
```

---

## Modification requise

### Fichier concerné
`src/components/rh/RHPreExport.tsx`

### Ajouter `baseHoraire` dans le tableau `nonEditable` (ligne 445)

```text
Avant :
const nonEditable = ["echelon", "niveau", "degre", "statut", "libelleEmploi", 
                     "typeContrat", "horaire", "heuresSuppMensualisees", 
                     "forfaitJours", "heuresReelles", "salaire"];

Après :
const nonEditable = ["echelon", "niveau", "degre", "statut", "libelleEmploi", 
                     "typeContrat", "baseHoraire", "horaire", 
                     "heuresSuppMensualisees", "forfaitJours", 
                     "heuresReelles", "salaire"];
```

---

## Résultat attendu

| Colonne | Avant | Après |
|---------|-------|-------|
| Base horaire | ✏️ Éditable (Input) | 🔒 Lecture seule (Texte) |

La colonne "Base horaire" s'affichera comme les autres colonnes contractuelles : en texte simple, sans champ de saisie.

---

## Fichier modifié

| Fichier | Modification |
|---------|--------------|
| `src/components/rh/RHPreExport.tsx` | Ajout de `baseHoraire` dans le tableau `nonEditable` |

