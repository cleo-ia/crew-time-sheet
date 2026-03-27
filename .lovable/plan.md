

## Consolidation absences dans la copie planning + filet de sécurité sync

### Couche 1 : `src/hooks/usePlanningAffectations.ts` — Nettoyage post-copie

Après l'INSERT des affectations copiées (ligne 291), ajouter un bloc qui :
1. Récupère les `demandes_conges` validées (`VALIDEE_CONDUCTEUR` ou `VALIDEE_RH`) chevauchant la semaine cible
2. Récupère les `absences_longue_duree` actives chevauchant la semaine cible
3. Construit un `Set<string>` de clés `employe_id|jour` bloquées
4. Supprime de `planning_affectations` toutes les entrées de la semaine cible dont `employe_id + jour` est dans ce Set
5. Met à jour le count retourné pour refléter le nombre réel

### Couche 2 : `supabase/functions/sync-planning-to-teams/index.ts` — Guard dans createNewAffectation

Au début de `createNewAffectation` (ligne ~1862), avant toute création de fiche/fiches_jours :
1. Récupérer les congés validés et ALD pour cet `employeId` sur la semaine courante
2. Filtrer `joursPlanning` pour exclure les jours couverts par une absence
3. Si après filtrage `joursPlanning` est vide, retourner `{ created: false, reason: 'Tous les jours couverts par absence' }`
4. Continuer avec les jours filtrés uniquement

Ce guard est un filet de sécurité : même si des `planning_affectations` "illégales" existent en BDD (données historiques ou edge case), le sync ne créera jamais de `fiches_jours` chantier sur un jour d'absence.

### Fichiers modifiés
- `src/hooks/usePlanningAffectations.ts` (ajout ~30 lignes après ligne 291)
- `supabase/functions/sync-planning-to-teams/index.ts` (ajout ~30 lignes au début de `createNewAffectation`)

### Zéro régression
- La création des fiches ghost (congés/ALD → RH) se fait dans une phase séparée indépendante (lignes 1630-1844), non impactée
- Les fiches avec statut protégé ne sont jamais touchées
- Le planning front continue d'afficher les absences grisées normalement

