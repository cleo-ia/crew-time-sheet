
# Plan : Ajouter la colonne "Base horaire" dans le pré-export RH

## Problème identifié

Le champ `base_horaire` est bien récupéré depuis la base de données et exporté dans le fichier Excel, mais il n'est **pas affiché** dans l'écran de pré-export car la colonne manque dans la définition `RIGHT_COLUMNS`.

---

## Modification requise

### Fichier concerné
`src/components/rh/RHPreExport.tsx`

### 1. Ajouter la colonne dans RIGHT_COLUMNS (ligne 81-82)

Insérer la nouvelle colonne entre "Type contrat" et "Horaire mensuel" :

```text
Avant :
  { key: "typeContrat", label: "Type contrat", width: 100, bg: "bg-slate-100" },
  { key: "horaire", label: "Horaire mensuel", width: 100, bg: "bg-slate-100" },

Après :
  { key: "typeContrat", label: "Type contrat", width: 100, bg: "bg-slate-100" },
  { key: "baseHoraire", label: "Base horaire", width: 100, bg: "bg-slate-100" },  // NOUVEAU
  { key: "horaire", label: "Horaire mensuel", width: 100, bg: "bg-slate-100" },
```

### 2. Ajouter le mapping dans getCellValue (vers ligne 379-380)

Ajouter le case pour récupérer la valeur :

```text
case "typeContrat": return data.type_contrat || "-";
case "baseHoraire": return data.base_horaire || "-";  // NOUVEAU
case "horaire": return data.horaire || "-";
```

---

## Résultat attendu

| Matricule | Nom | Prénom | ... | Type contrat | Base horaire | Horaire mensuel | ... |
|-----------|-----|--------|-----|--------------|--------------|-----------------|-----|
| M001 | DUPONT | Jean | ... | CDI | 39h | 151.67 | ... |
| M002 | MARTIN | Sophie | ... | CDD | 35h | 151.67 | ... |

La colonne sera visible dans le pré-export **ET** dans le fichier Excel généré.

---

## Fichier modifié

| Fichier | Modification |
|---------|--------------|
| `src/components/rh/RHPreExport.tsx` | Ajout colonne "Base horaire" dans RIGHT_COLUMNS + getCellValue |
