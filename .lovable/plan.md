

# Plan : Détail du blocage par chef/semaine au clic sur un badge

## Objectif

Quand Tanguy clique sur un badge semaine (ex: S12) d'un salarié dans le dialog "Fiches en attente", un sous-dialog s'ouvre et affiche :
- Le chef concerné et son chantier
- La liste des employés affectés à ce chef cette semaine-là
- Pour chaque employé, le statut de sa fiche (pas de fiche, brouillon = bloqué côté chef, validé chef = bloqué côté conducteur)
- Un résumé clair : "Bloqué côté chef" ou "Bloqué côté conducteur"

## Modifications

### 1. Enrichir les données — `src/hooks/useExportPaieReadiness.ts`

- Ajouter `chantier_id` à l'interface `FicheNonValidee` (map salarié → chantier_id par semaine)
- Stocker les paires `{semaine, chantierId}` au lieu de juste `semaine` pour pouvoir requêter ensuite

Ou plus simplement : garder l'interface actuelle et faire la requête de détail à la demande (au clic).

**Choix retenu** : requête à la demande (plus simple, pas besoin de changer le hook existant).

### 2. Nouveau hook — `src/hooks/useFicheBlockDetail.ts`

Hook qui prend `(salarieId, semaine)` et retourne :
- Le chantier et le chef associés (via `affectations_jours_chef` ou `fiches`)
- La liste des employés de l'équipe du chef sur ce chantier/semaine (via `affectations_jours_chef`)
- Pour chaque employé : son statut de fiche (`null` = aucune fiche, `BROUILLON`, `EN_SIGNATURE`, `VALIDE_CHEF`, etc.)
- Le diagnostic : si toutes les fiches sont en `BROUILLON`/`EN_SIGNATURE`/absentes → "Bloqué côté chef" ; si au moins une est `VALIDE_CHEF` → "Bloqué côté conducteur"

Logique :
1. Trouver la fiche du salarié pour cette semaine → récupérer `chantier_id`
2. Via `affectations_jours_chef`, trouver le `chef_id` du chantier/semaine
3. Lister tous les `macon_id` affectés à ce chef/chantier/semaine
4. Récupérer les fiches de chacun → statut
5. Enrichir avec noms depuis `utilisateurs`

### 3. Nouveau composant — `src/components/rh/FicheBlockDetailDialog.tsx`

Dialog affichant :
- Header : "Détail S12 — BELBAGHDADI Amine" avec le nom du chantier
- Diagnostic global en badge coloré : "Bloqué côté chef" (orange) ou "Bloqué côté conducteur" (rouge)
- Nom du chef et nom du conducteur
- Tableau des employés de l'équipe avec colonnes : Nom, Rôle, Statut (avec `StatusBadge` existant ou badge simplifié)

### 4. Modifier — `src/components/rh/FichesNonValideesDialog.tsx`

- Rendre les badges semaine cliquables (`cursor-pointer`, `onClick`)
- Au clic, ouvrir `FicheBlockDetailDialog` avec `salarieId` + `semaine`
- Ajouter un state local pour le dialog de détail

## Résumé des fichiers

| Fichier | Action |
|---|---|
| `src/hooks/useFicheBlockDetail.ts` | Créer |
| `src/components/rh/FicheBlockDetailDialog.tsx` | Créer |
| `src/components/rh/FichesNonValideesDialog.tsx` | Modifier (badges cliquables) |

