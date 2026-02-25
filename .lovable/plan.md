

## Problème identifié

La requête `fiches_jours` dans `buildRHConsolidation` (`src/hooks/rhShared.ts`, ligne 371-374) ne spécifie aucune limite. Supabase applique sa limite par défaut de **1 000 lignes**.

Avec "Toutes" les périodes sélectionnées, l'entreprise a **1 790 fiches_jours** éligibles. Les 790 dernières sont tronquées silencieusement, ce qui explique pourquoi certains employés comme Hafedh n'affichent qu'une partie de leurs heures (39h au lieu de 78h).

La vue détail (`useRHEmployeeDetail`) n'est pas affectée car elle charge les jours d'un seul salarié (quelques dizaines de lignes maximum).

## Correction

### Fichier : `src/hooks/rhShared.ts`

**1. Ligne 374** — Ajouter `.limit(10000)` à la requête `fiches_jours` :

```typescript
// Avant :
.in("fiche_id", ficheIds);

// Après :
.in("fiche_id", ficheIds)
.limit(10000);
```

**2. Ligne 346** — Même correction sur la requête `affectations_finisseurs_jours` (actuellement 14 lignes pour un finisseur, mais pourrait croître) :

```typescript
// Avant :
.select("finisseur_id, conducteur_id, date");

// Après (ajouter .limit en fin de chaîne, après les filtres existants) :
// Ajouter .limit(10000) après la ligne 360
```

### Détails techniques

- Supabase PostgREST applique par défaut `LIMIT 1000` quand aucun `.limit()` n'est spécifié
- 10 000 est une limite raisonnable (un salarié = ~20 jours/mois × 50 salariés × 12 mois max = 12 000 lignes au maximum absolu)
- Aucun changement de logique métier — la seule différence est que TOUTES les lignes sont désormais chargées
- La vue détail et l'export Excel ne sont pas affectés (ils font des requêtes ciblées par salarié)

