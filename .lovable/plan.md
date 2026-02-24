

## Suppression de `src/hooks/useAffectations.ts`

### Justification

- **0 import** dans tout le projet (verifie par recherche exhaustive)
- Le fichier pointe vers la table legacy `affectations` / `affectations_view` qui n'est plus la source de verite
- Le conserver risque de creer de la confusion pour un futur developpeur qui pourrait l'utiliser a la place des hooks planning
- Le code reste disponible dans l'historique Git si necessaire

### Action

| Action | Fichier |
|--------|---------|
| Supprimer | `src/hooks/useAffectations.ts` |

Aucun autre fichier a modifier -- pas d'import a retirer.

