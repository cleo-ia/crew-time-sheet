# Plan : Gestion des Chefs Multi-Chantiers sans Doublon d'Heures

## ✅ IMPLÉMENTÉ

### Contexte

Deux chefs sont actuellement affectés sur plusieurs chantiers :
- **Sébastien Bouillet** : MAILLARD + DAVOULT
- **Giovanni Dorazio** : CREUSOT VILET + CREUSOT HENRI

Le système créait des fiches distinctes pour chaque chantier, générant des doublons d'heures (78h au lieu de 39h par semaine).

## Solution Implémentée

### ✅ Volet 1 : Modification du schéma de données

Colonne `chantier_principal_id` ajoutée dans la table `utilisateurs` pour identifier le chantier principal d'un chef multi-chantiers.

**Migration exécutée** : Colonne ajoutée + initialisée pour les chefs existants (premier chantier actif par ordre de création)

### ✅ Volet 2 : Modification de la synchronisation

`supabase/functions/sync-planning-to-teams/index.ts` modifié pour :

1. **Détecter les chefs multi-chantiers** via `utilisateurs.chantier_principal_id`
2. **Skip la création de fiche personnelle** pour un chef sur un chantier secondaire
3. **Créer uniquement les affectations_jours_chef** pour router l'équipe vers ce chef

**Logique :**
```
Pour chaque couple (employé, chantier) dans le planning :
  SI l'employé a un chantier_principal_id défini ET ce n'est PAS ce chantier :
    → SKIP la création de fiche/fiches_jours personnelle
    → CRÉER les affectations_jours_chef pour l'équipe
```

### ✅ Volet 3 : Indication visuelle dans le Planning

**Fichiers modifiés :**
- `src/components/planning/PlanningEmployeRow.tsx` : Badge "★ Principal" / "Secondaire" cliquable
- `src/components/planning/PlanningChantierAccordion.tsx` : Détection des chefs + passage des props
- `src/pages/PlanningMainOeuvre.tsx` : Hook `useChefsWithPrincipal` pour récupérer les données
- `src/hooks/useSetChantierPrincipal.ts` : Nouveau hook pour changer le chantier principal

**Comportement :**
- Badge **★ Principal** (jaune) sur le chantier où les heures sont comptées
- Badge **Secondaire** (gris) sur les autres chantiers - cliquer pour définir comme principal
- Tooltip explicatif au survol

### ✅ Volet 4 : Script de nettoyage des doublons historiques

**Fichier créé :**
- `cleanup-doublons-chefs.sql` : Script SQL pour supprimer les fiches secondaires

## Prochaines Étapes (Manuel)

1. **Exécuter le script de nettoyage** dans Cloud View > Run SQL :
   - Ouvrir `cleanup-doublons-chefs.sql`
   - Exécuter les étapes 1-2 pour vérifier les doublons
   - Exécuter les étapes 3-5 pour supprimer les fiches secondaires
   - Exécuter l'étape 6 pour confirmer qu'il n'y a plus de doublons

2. **Tester le flux complet** :
   - Aller sur /planning-main-oeuvre
   - Vérifier que Sébastien Bouillet affiche "★ Principal" sur MAILLARD et "Secondaire" sur DAVOULT
   - Déclencher une synchronisation manuelle (Admin > Rappels > Synchroniser maintenant)
   - Vérifier dans les logs que le chef est "skipped" sur le chantier secondaire

## Impact sur le flux

| Étape | Avant | Après |
|-------|-------|-------|
| Planning S+1 | Chef planifié sur 2 chantiers = 2 fiches x 39h | Chef planifié sur 2 chantiers = 1 fiche x 39h (principal uniquement) |
| Sync Teams | 78h stockées en base | 39h stockées en base |
| Saisie Chef | Peut modifier ses heures depuis les 2 chantiers | Ses heures sont uniquement modifiables depuis le principal |
| Équipe | Membres ont leurs fiches sur chaque chantier | Inchangé |
| RH | Déduplication → 39h affichées (mais 78h en base) | 39h stockées = 39h affichées (cohérent) |
