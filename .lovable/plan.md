
# Plan de correction : Suppression de tous les filtres `chantier_id IS NULL`

## Contexte du problème

Le code actuel distingue les "finisseurs" des "maçons" en filtrant par `chantier_id = null`, ce qui est **incorrect**. 

**Règles métier confirmées :**
1. Une fiche est **toujours** liée à un chantier via `chantier_id`
2. La distinction entre employés se fait via le **rôle** (`finisseur`, `macon`, `grutier`, `chef`, `interimaire`)
3. Côté conducteur, une équipe peut contenir des finisseurs, maçons, grutiers et intérimaires sans forcément de chef
4. Toutes les données saisies par le conducteur doivent remonter en consultation RH avec le bon `chantier_id`

---

## Fichiers à corriger

### Groupe 1 : Consultation RH (priorité haute)

| Fichier | Ligne | Correction |
|---------|-------|------------|
| `src/hooks/rhShared.ts` | 277 | Supprimer `.is("chantier_id", null)` - toutes les fiches ont un chantier |
| `src/hooks/useRHData.ts` | 930 | Supprimer le cas "finisseurs autonomes" - plus pertinent |
| `src/hooks/useConducteurHistorique.ts` | 132 | Supprimer le filtre null - historique doit montrer toutes les fiches |

### Groupe 2 : Validation Conducteur (priorité haute)

| Fichier | Ligne | Correction |
|---------|-------|------------|
| `src/pages/ValidationConducteur.tsx` | 393 | Chercher par `chantier_id` depuis les affectations au lieu de null |
| `src/pages/SignatureFinisseurs.tsx` | 213, 243 | Idem - utiliser le `chantier_id` des affectations |

### Groupe 3 : Auto-sauvegarde et création de fiches

| Fichier | Ligne | Correction |
|---------|-------|------------|
| `src/hooks/useSaveFiche.ts` | 70 | Ne plus accepter `chantierId = null`, lever une erreur si absent |
| `src/hooks/useAutoSaveFiche.ts` | 124 | Idem - toujours exiger un `chantier_id` |
| `src/hooks/useCreateFicheJourForAffectation.ts` | 24 | Récupérer `chantier_id` depuis l'affectation |
| `src/hooks/useInitializeNextWeek.ts` | 25 | Ne plus créer de fiches avec `chantier_id = null` |

### Groupe 4 : Hooks utilitaires

| Fichier | Ligne | Correction |
|---------|-------|------------|
| `src/hooks/useFicheId.ts` | 19 | Exiger toujours un `chantierId` |
| `src/hooks/useFicheModifiable.ts` | 42 | Idem |
| `src/hooks/useInitialWeek.ts` | 71 | Filtrer par les chantiers du conducteur plutôt que null |
| `src/hooks/useWeekTransmissionStatus.ts` | 43 | Récupérer les fiches via les affectations/chantiers |

### Groupe 5 : Transport

| Fichier | Ligne | Correction |
|---------|-------|------------|
| `src/hooks/useSaveTransportV2.ts` | 28 | Exiger un `chantier_id` |
| `src/hooks/useAutoSaveTransportV2.ts` | 47 | Idem |

### Groupe 6 : Copie de données

| Fichier | Ligne | Correction |
|---------|-------|------------|
| `src/hooks/useCopyAllDataFinisseurs.ts` | 77 | Récupérer fiches via les affectations avec chantier |

### Groupe 7 : Edge Functions

| Fichier | Ligne | Correction |
|---------|-------|------------|
| `supabase/functions/purge-orphan-fiches/index.ts` | 77 | Fonction à revoir - concept "orphan" n'existe plus |
| `supabase/functions/purge-entreprise-weeks/index.ts` | 50 | Filtrer par `entreprise_id` directement |

---

## Stratégie d'implémentation

### Étape 1 : Correction `rhShared.ts` (consultation RH)
- Supprimer la requête `finisseursQuery` séparée
- Utiliser uniquement `fichesQuery` avec le filtre `entreprise_id`
- Toutes les fiches avec statut `ENVOYE_RH` ou `AUTO_VALIDE` doivent remonter

### Étape 2 : Correction flux Conducteur
- `ValidationConducteur.tsx` : Récupérer le `chantier_id` depuis `affectationsJours` pour chaque employé
- `SignatureFinisseurs.tsx` : Même approche - chercher fiches par `chantier_id` et `salarie_id`

### Étape 3 : Hooks de sauvegarde
- Ajouter une validation : si `chantierId` est null/undefined, lever une erreur
- Garantir que le sync-planning crée toujours les fiches avec un `chantier_id` valide

### Étape 4 : Nettoyage Edge Functions
- Supprimer ou adapter `purge-orphan-fiches` (les fiches orphelines ne devraient plus exister)
- Simplifier `purge-entreprise-weeks` en filtrant directement par `entreprise_id`

---

## Section technique : Modification de rhShared.ts

Le code actuel fait 2 requêtes séparées :
1. `fichesQuery` - fiches AVEC chantier (jointure sur `chantiers`)
2. `finisseursQuery` - fiches SANS chantier (`chantier_id IS NULL`)

**Nouveau code :**
```typescript
// Une seule requête - toutes les fiches de l'entreprise avec le bon statut
let fichesQuery = supabase
  .from("fiches")
  .select(`
    id, semaine, statut, salarie_id, chantier_id, entreprise_id,
    absences_export_override, trajets_export_override, acomptes, prets,
    commentaire_rh, notes_paie, total_saisie, saisie_du_mois,
    commentaire_saisie, regularisation_m1_export, autres_elements_export,
    chantiers(id, code, ville, conducteur_id, chef_id)
  `)
  .eq("entreprise_id", entrepriseId)
  .in("statut", filters.includeCloture 
    ? ["ENVOYE_RH", "AUTO_VALIDE", "CLOTURE"]
    : ["ENVOYE_RH", "AUTO_VALIDE"]);

// Appliquer les filtres conducteur/chef si demandés
if (filters.conducteur && filters.conducteur !== "all") {
  fichesQuery = fichesQuery.eq("chantiers.conducteur_id", filters.conducteur);
}
if (filters.chef && filters.chef !== "all") {
  fichesQuery = fichesQuery.eq("chantiers.chef_id", filters.chef);
}
```

Ensuite supprimer la variable `fichesFinisseurs` et utiliser uniquement `fichesAvecChantier`.

---

## Risques et précautions

1. **Données historiques** : Il peut exister des fiches anciennes avec `chantier_id = null`. Elles ne remonteront plus en RH.
   - Solution : Script SQL pour identifier et corriger ces fiches si nécessaire

2. **Tests de non-régression** : Vérifier que le flux Chef/Maçons continue de fonctionner normalement

3. **Volume de modifications** : 20+ fichiers à modifier - procéder par groupe fonctionnel

---

## Ordre d'implémentation

1. `rhShared.ts` - Pour que la consultation RH fonctionne immédiatement
2. `SignatureFinisseurs.tsx` et `ValidationConducteur.tsx` - Pour corriger le flux conducteur
3. `useSaveFiche.ts` et `useAutoSaveFiche.ts` - Pour empêcher la création de nouvelles fiches sans chantier
4. Autres hooks utilitaires
5. Edge functions en dernier
