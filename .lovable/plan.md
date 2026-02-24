

## Problème identifié

Tu as raison. Le badge "Saisie" (`is_chef_responsable`) ne devrait concerner **que les chantiers avec 2+ chefs**. Pour un chef seul sur un chantier (même multi-chantier), il est **automatiquement** le responsable — pas besoin de flag.

### Situation actuelle

**L'UI est correcte** : le badge "Saisie" ne s'affiche que quand `chefsOnThisChantier.length >= 2` (ligne 517 de `PlanningChantierAccordion.tsx`). C'est bon.

**Le problème est côté sync** (`sync-planning-to-teams`) : quand `is_chef_responsable = false` pour Thomas TEST (seul chef sur "test"), la sync le traite comme "chef secondaire" → il reçoit une fiche pré-remplie au lieu de gérer l'équipe normalement. C'est le bug.

### Ce qu'il faut corriger

**1. Edge Function `sync-planning-to-teams` (lignes ~304-332)** : Quand un chantier n'a qu'**un seul chef**, le traiter automatiquement comme responsable **peu importe le flag**.

```text
Logique actuelle :
  si is_chef_responsable = true → chef responsable
  sinon fallback jours → chef responsable
  
Logique corrigée :
  si 1 seul chef sur le chantier → TOUJOURS responsable (ignorer le flag)
  si 2+ chefs → utiliser is_chef_responsable, puis fallback jours
```

**2. `handleAddEmploye` dans `PlanningMainOeuvre.tsx` (ligne 259-273)** : Déjà correct (auto-set quand aucun responsable). Mais il faut aussi **s'assurer que le flag est mis à `true` quand on retire le 2ème chef** d'un chantier (le chef restant devient auto-responsable).

**3. Aucun changement UI** : Les badges Principal/Secondaire et Saisie fonctionnent déjà correctement côté affichage.

### Plan d'implémentation

| Fichier | Modification |
|---|---|
| `supabase/functions/sync-planning-to-teams/index.ts` | Dans la boucle `chefDaysPerChantier` (lignes 304-332), si `chefsMap.size === 1`, forcer le chef unique comme responsable sans vérifier le flag |
| `src/pages/PlanningMainOeuvre.tsx` | Dans le handler de suppression d'employé, quand on retire un chef et qu'il ne reste qu'un seul chef sur le chantier, auto-set `is_chef_responsable = true` pour le chef restant |

### Correction immédiate pour S15

Pour le test en cours, pas besoin de corriger le flag manuellement — la correction de la sync fera que Thomas sera automatiquement traité comme responsable puisqu'il est seul sur chaque chantier.

