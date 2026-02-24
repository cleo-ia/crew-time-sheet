
# Implementation du support multi-chefs par chantier

## Etape 1 : Migration BDD

Ajouter la colonne `is_chef_responsable` (boolean, defaut `false`) sur la table `planning_affectations`.

```sql
ALTER TABLE planning_affectations 
ADD COLUMN is_chef_responsable boolean NOT NULL DEFAULT false;
```

Pas de nouvelle RLS necessaire — la colonne herite des policies existantes sur `planning_affectations`.

---

## Etape 2 : Copie du planning (conserver le flag)

**Fichier** : `src/hooks/usePlanningAffectations.ts`

Dans `useCopyPlanningWeek`, ajouter `is_chef_responsable: aff.is_chef_responsable` dans le mapping des nouvelles affectations (ligne ~267). Sans ca, copier S15 vers S16 perdrait la designation du chef responsable.

Egalement mettre a jour l'interface `PlanningAffectation` pour ajouter le champ `is_chef_responsable?: boolean`.

---

## Etape 3 : UI Planning — Etoile "Chef responsable"

### 3a. `PlanningChantierAccordion.tsx`

- Ajouter un nouveau callback prop `onSetChefResponsable?: (employeId: string, chantierId: string) => void`
- Pour chaque employe de role "chef", passer les props `isChefResponsable` (derive des affectations) au composant `PlanningEmployeRow`

### 3b. `PlanningEmployeRow.tsx`

Le composant a deja les props `isChef`, `isChantierPrincipal`, `onSetChantierPrincipal` pour le systeme multi-site. On ajoute un **deuxieme badge** (ou on remplace) pour la designation "Chef responsable" sur ce chantier :

- Nouvelle prop `isChefResponsable?: boolean` et `onSetChefResponsable?: (employeId: string) => void`
- Afficher un badge/etoile distincte du badge "Principal/Secondaire" existant (qui concerne le multi-site, pas le multi-chef)
- L'etoile "Responsable" n'apparait QUE si **2+ chefs** sont presents sur le meme chantier. Si un seul chef, pas besoin d'afficher — c'est implicite.

### 3c. `PlanningMainOeuvre.tsx`

- Nouvelle mutation `handleSetChefResponsable(employeId, chantierId)` qui :
  1. Met `is_chef_responsable = false` pour tous les chefs du chantier/semaine
  2. Met `is_chef_responsable = true` pour le chef designe
- Dans `handleAddEmploye` : quand on ajoute un chef, verifier s'il y a deja un chef responsable sur ce chantier. Si non, le marquer automatiquement `is_chef_responsable = true`.
- Passer le callback `onSetChefResponsable` au `PlanningChantierAccordion`

---

## Etape 4 : Edge Function `sync-planning-to-teams`

**Fichier** : `supabase/functions/sync-planning-to-teams/index.ts`

### 4a. Determiner le chef responsable (lignes 273-307)

Remplacer la logique "chef avec le plus de jours" par :
1. Chercher dans les affectations du planning celui qui a `is_chef_responsable = true`
2. **Fallback** : si aucun n'est marque (donnees anciennes), garder la logique actuelle (le plus de jours, premier trouve en cas d'egalite)

### 4b. Ne plus migrer les fiches/affectations du chef secondaire (lignes 376-428)

Actuellement, quand `chantiers.chef_id` change, le code migre TOUTES les fiches et affectations du chantier vers le nouveau chef. Modifier pour :
- Mettre a jour `chantiers.chef_id` vers le chef responsable (inchange)
- Migrer les fiches dont `user_id` = ancien chef vers le nouveau chef responsable SAUF celles ou `salarie_id` = un chef (chaque chef garde sa propre fiche)
- Migrer les `affectations_jours_chef` des employes (non-chefs) vers le nouveau chef_id, mais garder les lignes du chef secondaire avec son propre `chef_id`

### 4c. Chef secondaire — creation de sa fiche personnelle (lignes 482-543)

Le code actuel traite TOUT chef sur un chantier != `chantier_principal_id` comme "secondaire multi-site" et lui cree une fiche 0h. Modifier pour :
- Si le chef est le `is_chef_responsable` du chantier : traitement normal (il recoit ses heures, il gere l'equipe)
- Si le chef N'EST PAS `is_chef_responsable` : il est "chef secondaire sur ce site", creer une fiche avec ses heures personnelles (8h/jour sauf 7h vendredi), mais PAS de gestion d'equipe

---

## Etape 5 : Filtre RH

**Fichier** : `src/hooks/rhShared.ts` (ligne 254)

Remplacer :
```typescript
fichesQuery = fichesQuery.eq("chantiers.chef_id", filters.chef);
```
Par une logique en 2 temps :
1. Recuperer les `chantier_id` ou ce chef a des `affectations_jours_chef` dans les semaines du mois
2. Filtrer les fiches sur ces chantiers (via `.in("chantier_id", chantierIds)`)

Cela permet de retrouver les fiches gerees par un chef secondaire en RH.

---

## Etape 6 : Dashboard et Admin

**Fichier** : `src/hooks/useDashboardStats.ts`
- Ajuster `chantiersActifsAvecChef` pour ne pas compter comme "orphelin" un chantier qui a un chef secondaire dans le planning

**Fichier** : `src/components/admin/ChefsManager.tsx`
- Enrichir `getChantierForChef` pour aussi chercher dans `affectations_jours_chef`

---

## Garanties de non-regression

- **Multi-site (chef sur plusieurs chantiers)** : Le champ `utilisateurs.chantier_principal_id` et le badge "Principal/Secondaire" existant restent 100% inchanges. C'est un axe orthogonal.
- **Saisie des heures** : Le chef responsable (`chantiers.chef_id`) continue de voir et gerer toute l'equipe. Le chef secondaire voit uniquement ses propres heures.
- **Export Excel / Ventilation** : Aucun changement — ces modules aggregent par `salarie_id` depuis `fiches_jours`.
- **Signatures / Validation conducteur** : Aucun changement.
- **Copie de planning** : Le flag `is_chef_responsable` est copie avec le reste.

## Ordre d'execution

1. Migration BDD (`is_chef_responsable`)
2. Interface TypeScript (`PlanningAffectation`) + copie planning
3. UI Planning (etoile + mutation)
4. Edge Function sync
5. Filtre RH
6. Dashboard + Admin
7. Test sur S09/SCHUMAN puis S15
