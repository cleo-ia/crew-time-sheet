

# Plan : Exclure les intérimaires du dialog "Fiches En Attente"

## Objectif

Les intérimaires sont gérés séparément (exports PDF par agence) et ne doivent pas apparaître dans la liste des fiches non validées de l'export paie.

## Modification unique

### `src/hooks/useExportPaieReadiness.ts`

Dans la requête fiches (ligne 67), ajouter `agence_interim` au select :
```
utilisateurs!salarie_id(nom, prenom, role_metier, agence_interim)
```

Dans la boucle de construction de `nonValideesMap` (ligne 155-169), ajouter un filtre pour exclure les salariés avec `agence_interim` non null :
```typescript
const utilisateur = f.utilisateurs as unknown as { nom: string; prenom: string; role_metier: string | null; agence_interim: string | null } | null;
if (utilisateur?.agence_interim) continue; // Exclure les intérimaires
```

Aucun autre fichier impacté.

