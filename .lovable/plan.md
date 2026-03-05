

## Correction : compteur trajets à 0 pour chantier ÉCOLE dans le recap conducteur

### Problème
Dans `FicheDetail.tsx`, le compteur de trajets (ligne 440-443) compte tous les jours avec `heures > 0` comme des jours de trajet. Pour les fiches ÉCOLE (35h, 7h/jour), cela affiche "5 trajets" au lieu de "0".

### Correction
Fichier : `src/components/validation/FicheDetail.tsx`

**Lignes 439-443** — Ajouter une vérification `is_ecole` dans le calcul de `totalTrajets` :
- Si le chantier est un chantier ÉCOLE (`ficheData?.chantier?.is_ecole === true`), forcer `totalTrajets = 0`
- Sinon, garder la logique existante (jours avec heures > 0 et trajet_perso = false)

C'est une modification de 2-3 lignes uniquement.

