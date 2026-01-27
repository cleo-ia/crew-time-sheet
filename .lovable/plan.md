
# Correction : Retour vers la bonne page pour les chefs

## Problème identifié

Le hook `useCurrentUserRole` retourne le rôle **prioritaire** de l'utilisateur (ex: `super_admin` > `conducteur` > `chef`). Donc quand un utilisateur avec plusieurs rôles accède au planning depuis la page chef, le hook peut retourner un autre rôle, et le bouton "Retour" redirige vers `/chantiers` au lieu de `/`.

De plus, même pour un utilisateur **uniquement chef**, la logique actuelle ne fonctionne pas si le hook met du temps à charger (`userRole` peut être `undefined` au premier rendu).

## Solution proposée

Utiliser un **paramètre dans l'URL** (`?from=chef`) pour indiquer l'origine de la navigation. C'est plus fiable que de se baser sur le rôle.

### Flux utilisateur corrigé

```text
Chef clique "Planning tâches"
        ↓
Navigation vers /chantiers/abc123?from=chef
        ↓
ChantierDetailHeader lit le paramètre "from=chef"
        ↓
Bouton "Retour" → navigue vers "/" (page de saisie)
```

## Fichiers à modifier

### 1. `src/pages/Index.tsx`

Ajouter le paramètre `?from=chef` dans l'URL de navigation :

```typescript
// Ligne ~498
onClick={() => navigate(`/chantiers/${selectedChantier}?from=chef`)}
```

### 2. `src/components/chantier/ChantierDetailHeader.tsx`

Lire le paramètre `from` de l'URL et l'utiliser pour déterminer le chemin de retour :

```typescript
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";

export const ChantierDetailHeader = ({ chantier, onImageClick }: ChantierDetailHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: userRole } = useCurrentUserRole();

  const { backPath, backLabel } = useMemo(() => {
    // Si admin, retour vers admin
    if (location.pathname.startsWith("/admin")) {
      return { backPath: "/admin?tab=chantiers", backLabel: "Retour aux chantiers" };
    }
    
    // Si vient de la page chef (paramètre from=chef dans l'URL)
    const fromChef = searchParams.get("from") === "chef";
    if (fromChef || userRole === "chef") {
      return { backPath: "/", backLabel: "Retour à la saisie" };
    }
    
    // Sinon (conducteur), retour vers la liste des chantiers
    return { backPath: "/chantiers", backLabel: "Retour aux chantiers" };
  }, [location.pathname, userRole, searchParams]);
  
  // ... reste du code
};
```

## Résumé des modifications

| Fichier | Modification |
|---------|-------------|
| `src/pages/Index.tsx` | Ajouter `?from=chef` dans l'URL de navigation |
| `src/components/chantier/ChantierDetailHeader.tsx` | Lire `searchParams.get("from")` et rediriger vers `/` si `from=chef` |

## Avantages de cette solution

- Fonctionne même avec un compte multi-rôles (super_admin + chef)
- Ne dépend pas du timing de chargement du hook `useCurrentUserRole`
- Explicite et prévisible
- Le paramètre `?from=chef` n'affecte pas le fonctionnement de la page
