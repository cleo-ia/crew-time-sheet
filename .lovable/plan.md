
# Correction : Mode lecture seule basé sur l'URL

## Problème identifié

Le mode lecture seule ne fonctionne pas car la détection est basée sur `userRole === "chef"`. Or le hook `useCurrentUserRole` retourne le **rôle prioritaire** de l'utilisateur.

Si le compte a plusieurs rôles (ex: `super_admin` + `chef`), le hook retourne `super_admin`, et donc `isReadOnly = false`.

**Preuve** : Vous arrivez sur la page via `/chantiers/:id?from=chef`, mais le paramètre n'est pas utilisé pour déterminer le mode lecture seule.

## Solution

Utiliser le paramètre URL `?from=chef` (déjà présent) pour forcer le mode lecture seule, en plus de la vérification du rôle.

## Fichier à modifier

### `src/pages/ChantierDetail.tsx`

Lire le paramètre `from` dans l'URL et l'utiliser pour déterminer `isReadOnly` :

```typescript
import { useParams, useSearchParams } from "react-router-dom";

// Dans le composant :
const [searchParams] = useSearchParams();
const { data: userRole } = useCurrentUserRole();

// Mode lecture seule si vient de la page chef OU si le rôle est chef
const fromChef = searchParams.get("from") === "chef";
const isReadOnly = fromChef || userRole === "chef";
```

## Comportement après correction

| Origine | Paramètre URL | Rôle détecté | Mode |
|---------|---------------|--------------|------|
| Page Index (chef clique "Planning tâches") | `?from=chef` | n'importe lequel | **Lecture seule** |
| Page /chantiers (conducteur) | aucun | conducteur | Édition |
| Admin panel | aucun | admin | Édition |
| Chef uniquement accédant directement | aucun | chef | **Lecture seule** |

## Résumé

Une seule ligne à modifier dans `ChantierDetail.tsx` pour lire le paramètre URL et forcer le mode lecture seule quand `from=chef`.
