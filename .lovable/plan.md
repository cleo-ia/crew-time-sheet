
# Plan : Activer la feature ratioGlobal pour SDER

## Contexte
SDER, comme Limoge Revillon, est une entreprise de gros œuvre qui a besoin de suivre les ratios journaliers de production (M³ béton, ML voile, M² coffrage).

## Analyse de sécurité effectuée

| Point vérifié | Statut | Détail |
|---------------|--------|--------|
| Table `ratios_journaliers` | ✅ | Colonne `entreprise_id` présente |
| Trigger d'isolation | ✅ | `tr_ratios_set_entreprise` remplit automatiquement l'`entreprise_id` via la fiche parente |
| Isolation des données | ✅ | Les ratios sont liés à `fiche_id`, déjà filtré par entreprise |
| Hook `useRatiosJournaliers` | ✅ | Filtre par `fiche_id` - pas de requête globale |
| Composant `RatioGlobalSheet` | ✅ | Dépend de `ficheId` isolé par entreprise |
| RLS sur table `fiches` | ✅ | Politique active avec `user_has_access_to_entreprise()` |

## Résultat : Activation sûre

Aucun risque de fuite de données entre SDER et Limoge Revillon. Chaque entreprise verra uniquement ses propres ratios.

---

## Modification à effectuer

### Fichier : `src/config/enterprises/sder.ts`

Ajouter `ratioGlobal: true` dans la section `features` :

```typescript
features: {
  ...defaultFeatures,
  pointsMeteo: true,
  ratioGlobal: true,  // ← AJOUTER CETTE LIGNE
},
```

---

## Impact utilisateur

Après activation, les chefs SDER verront dans leur interface de saisie :
- Un accordéon **"Ratio Global"** dépliant un tableau avec :
  - Colonnes : M³ béton, ML voile, M² coffrage (+ nb personnes pour chaque)
  - Sélecteur météo du jour
  - Champs observations et incidents
  - Ligne de totaux et ratios par personne

Les conducteurs SDER verront ces données en **lecture seule** lors de la validation des fiches.

---

## Aucune migration base de données requise

La table `ratios_journaliers` et son trigger existent déjà. L'activation est purement frontend via le feature flag.
