

# Audit complet : bug "Principal/Secondaire" des chefs multi-chantiers

## Diagnostic du problème

Le `chantier_principal_id` est stocké **une seule fois, globalement** dans la table `utilisateurs`. Or le planning change chaque semaine.

### Scénario exact du bug (DORAZIO Giovanni)

1. **S11** : DORAZIO est sur PRESTIGE → son `chantier_principal_id` pointe vers PRESTIGE (auto-assigné par la sync ou manuellement)
2. **S12** : Le conducteur copie le planning S11 → S12, puis modifie les affectations : DORAZIO passe sur MASSILLY + CAPUCINES
3. **Résultat** : `utilisateurs.chantier_principal_id` pointe toujours sur PRESTIGE (un chantier où il n'est même plus affecté en S12)
4. **Conséquence UI** : Le code compare `chantier_principal_id` (PRESTIGE) avec MASSILLY et CAPUCINES → aucun match → les deux affichent "Secondaire"

### Problèmes identifiés

| # | Problème | Fichier |
|---|----------|---------|
| 1 | **Badge UI** : lit `utilisateurs.chantier_principal_id` (global, pas par semaine) | `PlanningMainOeuvre.tsx:57-86` + `PlanningChantierAccordion.tsx:513-514` |
| 2 | **Copy from previous week** : copie les `planning_affectations` mais ne met PAS à jour `chantier_principal_id` | `usePlanningAffectations.ts:267-276` |
| 3 | **Sync Edge Function** : auto-assigne `chantier_principal_id` pour les chefs mono-chantier, mais PAS pour les multi-chantiers | `sync-planning-to-teams:670-706` |
| 4 | **Sync Edge Function** : utilise `chantier_principal_id` pour décider 0h vs heures normales → si le pointeur est obsolète, les heures sont mal initialisées | `sync-planning-to-teams:781-828` |
| 5 | **TimeEntryTable** : utilise `chantier_principal_id` pour la logique "absent auto" côté chef | `TimeEntryTable.tsx:262-274` |
| 6 | **rhShared** : utilise `chantier_principal_id` pour le code trajet par défaut | `rhShared.ts:729-731` |

### Pourquoi la sync ne corrige pas déjà le problème

La sync (lundi 5h) **auto-assigne** le `chantier_principal_id` uniquement pour les chefs **mono-chantier** (1 seul chantier dans le planning). Pour les chefs **multi-chantiers**, elle lit la valeur existante sans la vérifier. Si le chef a changé de chantiers entre deux semaines, la valeur reste obsolète.

---

## Fix proposé

**Principe** : Pour les chefs multi-chantiers, le `chantier_principal_id` doit être **automatiquement recalculé** quand le planning change, en se basant sur les affectations de la semaine courante.

### 1. Sync Edge Function — auto-assign multi-chantiers

**Fichier** : `supabase/functions/sync-planning-to-teams/index.ts` (lignes 670-706)

Après la boucle existante pour les chefs mono-chantier, ajouter une logique pour les multi-chantiers :
- Si un chef a 2+ chantiers dans le planning ET que son `chantier_principal_id` actuel ne fait PAS partie de ses chantiers de la semaine → **recalculer** en prenant le chantier avec le plus de jours (ou le premier par ordre alphabétique en cas d'égalité)
- Mettre à jour `utilisateurs.chantier_principal_id` et le map local

### 2. UI Planning — recalcul local du badge

**Fichier** : `src/pages/PlanningMainOeuvre.tsx` (hook `useChefsWithPrincipal`)

Modifier la logique du badge pour qu'elle vérifie la cohérence :
- Si le `chantier_principal_id` d'un chef ne correspond à aucun de ses chantiers affichés dans le planning de la semaine courante → fallback sur le chantier avec le plus de jours d'affectation cette semaine
- Cela corrige l'affichage **immédiatement** sans attendre la sync

### 3. Copy from previous week — invalider le cache

**Fichier** : `src/hooks/usePlanningAffectations.ts` (onSuccess du copy)

Après la copie, invalider la query `chefs-chantier-principal` pour forcer le recalcul du badge.

### 4. handleAddEmploye / handleRemoveEmploye — mise à jour immédiate

**Fichier** : `src/pages/PlanningMainOeuvre.tsx`

Quand un chef est ajouté/retiré d'un chantier, vérifier si son `chantier_principal_id` est toujours valide parmi ses chantiers actifs de la semaine. Si non, le mettre à jour automatiquement.

---

### Fichiers impactés

1. `supabase/functions/sync-planning-to-teams/index.ts` — auto-assign multi-chantiers
2. `src/pages/PlanningMainOeuvre.tsx` — fallback UI du badge + mise à jour auto
3. `src/hooks/usePlanningAffectations.ts` — invalidation cache après copy
4. `src/components/planning/PlanningChantierAccordion.tsx` — aucun changement (consomme déjà la Map)

### Ce qui ne change PAS

- Le champ `utilisateurs.chantier_principal_id` reste la source de vérité persistée (pas de nouvelle table)
- La logique 0h sur chantier secondaire dans la sync reste identique
- Les hooks `TimeEntryTable`, `rhShared`, `ChantierSelector` continuent à lire `chantier_principal_id` — ils bénéficieront automatiquement de la correction car la valeur sera toujours cohérente

