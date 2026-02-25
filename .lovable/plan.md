

## Correction du Problème #1 : `user_id` du chef secondaire

### Le problème

Ligne 637 de `supabase/functions/sync-planning-to-teams/index.ts` :

```
user_id: plannedChef?.chefId || employeId
```

Quand le système crée la fiche de Giovanni (chef secondaire), il met `user_id = Amine` (le chef Saisie) au lieu de `user_id = Giovanni`. La fiche de Giovanni porte donc le nom d'Amine comme "gestionnaire".

### La correction

Remplacer la ligne 637 par :

```
user_id: employeId
```

Puisque chaque chef gère ses propres heures de manière indépendante, la fiche doit porter l'identifiant du chef concerné, pas celui du chef responsable de la saisie.

### Impact

- Aucun risque fonctionnel : le conducteur et le RH utilisent `salarie_id` (qui est déjà correct) pour identifier le salarié
- Les fiches existantes déjà créées avec le mauvais `user_id` ne seront pas corrigées rétroactivement (uniquement les nouvelles créations lors des prochaines syncs)
- Redéploiement de la Edge Function nécessaire

