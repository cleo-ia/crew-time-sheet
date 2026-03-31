

## Corriger le badge "Sans chef" dans l'export paie

### Cause racine confirmée

Le badge "Sans chef" et le détail utilisent deux logiques **différentes** pour trouver le chef :

- **Badge** (`useExportPaieReadiness.ts`, lignes 176-187) : cherche l'employé dans `affectations_jours_chef.macon_id` — si aucune ligne trouvée → "Sans chef"
- **Détail** (`useFicheBlockDetail.ts`, ligne 58) : cherche dans `affectations_jours_chef` puis **fallback sur `chantiers.chef_id`** — trouve toujours le chef

C'est un **bug d'affichage uniquement**. Les données (heures, signatures, fiches) sont correctes.

### Pourquoi certains employés sont impactés et pas d'autres

Les lignes dans `affectations_jours_chef` peuvent manquer pour certains employés si :
- Le sync a eu une erreur partielle pour ces employés spécifiques
- Le chantier n'avait pas de `chef_id` au moment du sync (routé vers `affectations_finisseurs_jours` à la place)
- Un chef apparaît avec le badge car le code ne distingue pas les chefs (qui n'ont pas besoin de cette vérification)

### Correction prévue

**Fichier : `src/hooks/useExportPaieReadiness.ts`**

Remplacer la logique actuelle (lignes 174-187) qui cherche dans `affectations_jours_chef` par une approche à 2 niveaux :

1. **Exclure les chefs** : un employé avec `role_metier === "chef"` ne doit jamais avoir le badge "Sans chef"
2. **Utiliser `chantiers.chef_id` comme source principale** : pour chaque fiche non validée, vérifier si le chantier associé a un `chef_id` non null (la donnée est déjà disponible dans la requête des fiches via un join sur `chantiers`)
3. **Fallback sur `affectations_jours_chef`** comme vérification secondaire

Concrètement :
- Modifier la requête initiale des fiches (ligne ~65) pour joindre aussi `chantiers!inner(chef_id)` (ou ajouter `chef_id` au select existant via un second join)
- Pour chaque employé non validé : `sansChef = roleMetier !== "chef" && !chantierHasChef && !inAffectationsJoursChef`

### Impact
- Cohérence entre le badge et le détail
- Les chefs n'auront plus jamais le badge "Sans chef"
- Aucun changement de logique métier, uniquement l'affichage

