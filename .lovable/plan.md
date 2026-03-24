

## Plan : Fix sync-planning-to-teams — Nettoyage jours fantômes affectations

### Statut : ✅ IMPLÉMENTÉ ET DÉPLOYÉ

### Problème
La fonction `sync-planning-to-teams` faisait des `upsert` pour les jours planifiés dans `affectations_jours_chef` et `affectations_finisseurs_jours`, mais ne supprimait jamais les jours non-planifiés pour le même couple (employé, chantier, semaine). Cela créait des "fantômes" persistant d'anciens plannings.

### Correction
Ajout de 2 helpers (`deleteStaleAffectationJoursChef` et `deleteStaleAffectationFinisseursJours`) appelés systématiquement après chaque boucle d'upsert dans les 8 branches du code :
1. Chef secondaire — fiche protégée
2. Chef secondaire — fiche non protégée
3. Chef responsable chantier secondaire — fiche protégée
4. Chef responsable chantier secondaire — fiche non protégée
5. `createNewAffectation` — fiche protégée (chef)
6. `createNewAffectation` — fiche protégée (finisseur)
7. `createNewAffectation` — standard (chef)
8. `createNewAffectation` — standard (finisseur)

### Non-régression confirmée
- Garde-fou chef 5/5 chantier principal : **non touché**
- Chefs multi-chantiers (BOUILLET, DORAZIO) : collisions légitimes confirmées (0h secondaire)
- Fantômes existants (BAH/SCHUMAN, KONATE/CAPUCINES en S13) : confirmés comme bugs pré-fix
- Protection fiches statuts avancés : **préservée**
- Isolation multi-tenant : **préservée**
