

## Correction du crash `useExportPaieReadiness`

### Problème

La colonne `periode` dans `periodes_cloturees` contient **deux formats différents** :
- `"Décembre 2025"` (texte français)
- `"2025-11"` (format yyyy-MM)

Le hook a deux bugs liés :

1. **Ligne 88** — `.eq("periode", periode)` compare avec `"2026-03"` mais la DB peut contenir `"Mars 2026"`. La clôture du mois courant n'est donc jamais trouvée si le format est français.

2. **Lignes 128-129** — `derniereCloture.periode.split("-")` crashe sur `"Décembre 2025"` car le split produit des valeurs non numériques → `NaN` → `Invalid Date` → le hook throw → React Query passe en erreur → les cartes disparaissent.

### Correction dans `src/hooks/useExportPaieReadiness.ts`

**1. Vérification de clôture (ligne ~85-90)** : ne plus chercher par `.eq("periode", periode)` seul. Chercher les deux formats possibles avec `.or()` :
- `periode.eq.2026-03` (format yyyy-MM)  
- `periode.eq.Mars 2026` (format français)

On génère le label français du mois avec `format(date, "MMMM yyyy", { locale: fr })` et on cherche les deux.

**2. Dernière clôture (lignes 126-130)** : parser `periode` de manière robuste :
- Si ça matche `yyyy-MM` → parser normalement
- Sinon → utiliser directement la valeur telle quelle comme `moisDerniereCloture` (c'est déjà un label lisible comme "Décembre 2025")

### Fichier modifié

| Fichier | Changement |
|---------|-----------|
| `src/hooks/useExportPaieReadiness.ts` | Corriger la requête clôture pour chercher les 2 formats + parser `periode` de manière défensive |

