

## Diagnostic confirmé

Thomas TEST est `isChefResponsable = true` sur CI000 **et** CI002 (seul chef sur chaque site). Il ne rentre donc **jamais** dans la branche `!isChefResponsable` (ligne 559) où on a mis le fix 0h. Il tombe dans le flux standard `copyFichesFromPreviousWeek` / `createNewAffectation` (lignes 703-747) qui crée des fiches avec 39h.

## Correction

**Fichier** : `supabase/functions/sync-planning-to-teams/index.ts`

**Emplacement** : lignes 700-701, juste après le `}` de la branche `!isChefResponsable` et avant le commentaire `// Récupérer les affectations S-1`.

**Ajout** : un nouveau bloc qui intercepte le cas "chef responsable mais sur son chantier secondaire" :

```text
if (employe.role_metier === 'chef') {
  ...
  if (!isChefResponsable) {
    // branche existante (2 chefs même chantier) ← déjà corrigée, on ne touche pas
    continue
  }
  // ← ICI : NOUVEAU BLOC
  // Si isChefResponsable ET chantier ≠ chantier_principal_id → 0h
  const chefPrincipalChantierId = chefPrincipalMap.get(employeId)
  if (chefPrincipalChantierId && chefPrincipalChantierId !== chantierId) {
    → créer/récupérer fiche
    → supprimer fiches_jours existantes
    → recréer fiches_jours à 0h/0T/0PA pour chaque jour
    → mettre total_heures = 0
    → créer affectations_jours_chef (chef_id = employeId, macon_id = employeId)
    → continue (ne PAS tomber dans copy/create)
  }
}
// flux normal copy/create (ligne 703+) pour les non-chefs et chefs sur leur principal
```

**Détail des valeurs pour les fiches_jours sur chantier secondaire** :

| Champ | Valeur |
|-------|--------|
| heures | 0 |
| HNORM | 0 |
| HI | 0 |
| T | 0 |
| PA | false |
| pause_minutes | 0 |
| code_trajet | null |
| repas_type | null |
| code_chantier_du_jour | code du chantier secondaire |
| ville_du_jour | ville du chantier secondaire |

**Fiche** : `total_heures = 0`, `statut = 'BROUILLON'`

## Garde-fou existant (lignes 780-799)

Le garde-fou qui supprime les `affectations_jours_chef` du chef sur les chantiers secondaires reste utile et ne change pas. Il nettoie les affectations "polluées" en tant que **macon_id** (membre d'équipe), ce qui est correct : le chef ne doit pas apparaître dans l'équipe de son chantier secondaire.

## Impact

- Seul `sync-planning-to-teams/index.ts` est modifié
- Pas de changement UI ni DB
- Re-déploiement + re-sync S15 nécessaire

