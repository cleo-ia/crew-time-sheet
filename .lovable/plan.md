

## Plan : Exclure les fiches ghost (congés/absences) du filtre par chantier

### Probleme
Les fiches ghost (congés, absences longue duree) ont `chantier_id = null`. La requete ghost (ligne 278-312) ne filtre jamais par chantier, donc ces employes apparaissent dans **tous** les chantiers quand on filtre.

### Correction

**Fichier** : `src/hooks/rhShared.ts` (ligne 312)

Ajouter une condition : si un filtre chantier est actif, ne pas inclure les fiches ghost.

```typescript
// Ligne ~312 : après la requête ghost, avant la fusion
const hasChantierFilter = filters.chantier && filters.chantier !== "all";

const fichesGhostNormalized = hasChantierFilter
  ? [] // Pas de ghost quand on filtre par chantier
  : (fichesGhost || []).map(f => ({
      ...f,
      chantiers: {
        code_chantier: null,
        ville: null,
        conducteur_id: null,
        chef_id: null,
        entreprise_id: f.entreprise_id,
      }
    }));
```

### Impact
- Filtre "Tous les chantiers" : les employes en conge/absence restent visibles
- Filtre chantier specifique : les employes en conge/absence disparaissent (pas de confusion)
- 1 seul fichier modifie, 3 lignes ajoutees

