

# Plan : Badge "Sans chef" pour les employés gérés par un conducteur

## Objectif

Ajouter un badge "Sans chef" (style discret, ex: gris/bleu) a cote du `RoleBadge` dans le dialog "Fiches en attente" pour les employes qui n'ont aucune affectation chef (`affectations_jours_chef`) sur les semaines concernees.

## Modifications

### 1. `src/hooks/useExportPaieReadiness.ts`

- Ajouter un champ `sansChef: boolean` a l'interface `FicheNonValidee`
- Apres avoir construit `nonValideesMap`, faire une requete batch sur `affectations_jours_chef` pour toutes les semaines du mois, filtrant sur les `macon_id` presents dans la map
- Pour chaque salarie, si aucune ligne `affectations_jours_chef` n'existe pour ses semaines non validees, marquer `sansChef: true`

### 2. `src/components/rh/FichesNonValideesDialog.tsx`

- A cote du `RoleBadge`, afficher conditionnellement un badge "Sans chef" si `f.sansChef === true`
- Style : `Badge variant="outline"` avec couleur distinctive (ex: bleu/gris) pour differencier visuellement

## Fichiers

| Fichier | Action |
|---|---|
| `src/hooks/useExportPaieReadiness.ts` | Modifier (ajouter `sansChef` + requete affectations) |
| `src/components/rh/FichesNonValideesDialog.tsx` | Modifier (afficher badge) |

