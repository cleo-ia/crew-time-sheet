

# Exclure les jours ALD et congés validés de la paie prévisionnelle

## Problème
`generateEstimatedDays` génère des jours estimés (8h, panier, T1) pour les dates sans fiche_jours, sans vérifier si le salarié est en **absence longue durée (ALD)** ou en **congé validé (CP, RTT, maladie…)** sur ces dates. Résultat : KAMAGATE Lancine apparaît avec 2 jours estimés les 30-31 mars alors qu'il est en ALD.

## Solution

### 1. Charger les absences ALD et congés validés dans `buildRHConsolidation` (`src/hooks/rhShared.ts`)

Avant la boucle par salarié (vers ligne 530), ajouter 2 requêtes Supabase :

- **`absences_longue_duree`** : `date_debut <= dateFin` et `date_fin IS NULL OR date_fin >= dateDebut`
- **`demandes_conges`** avec `statut IN ('VALIDEE_CONDUCTEUR', 'VALIDEE_RH')` : `date_debut <= dateFin` et `date_fin >= dateDebut`

Construire une `Map<salarieId, Set<date>>` des jours bloqués.

### 2. Passer les dates bloquées à `generateEstimatedDays` (`src/hooks/usePaiePrevisionnelle.ts`)

- Ajouter une option `blockedDates?: Set<string>` aux paramètres de `generateEstimatedDays`
- Juste après le calcul de `datesManquantes`, filtrer : retirer les dates présentes dans `blockedDates`
- Ainsi, aucun jour estimé ne sera créé pour un salarié en ALD ou congé validé

### 3. Passer le paramètre depuis `rhShared.ts`

Dans l'appel à `generateEstimatedDays` (ligne 812), ajouter :
```typescript
blockedDates: absenceDatesMap.get(salarieId),
```

## Fichiers modifiés
- `src/hooks/rhShared.ts` — ajout des 2 requêtes + passage du paramètre
- `src/hooks/usePaiePrevisionnelle.ts` — ajout de l'option `blockedDates` et filtrage

## Impact
Seuls les salariés sans ALD ni congé validé auront des jours estimés. Les salariés comme KAMAGATE n'auront plus de jours "fantômes" dans l'export paie.

