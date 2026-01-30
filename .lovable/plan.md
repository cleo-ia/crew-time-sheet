

# Suppression de la bannière "Mode développement"

## Résumé

Supprimer la bannière d'avertissement "Mode développement : Authentification désactivée" qui s'affiche à tort sur la page chef de chantier, même en production.

## Problème identifié

La bannière est affichée **de manière inconditionnelle** dans `src/pages/Index.tsx` (lignes 476-484), sans vérification de l'environnement. C'est un résidu de développement qui n'aurait jamais dû arriver en production.

## Modification

### Fichier : `src/pages/Index.tsx`

**Action** : Supprimer entièrement le bloc suivant (lignes 476-484) :

```tsx
{/* Warning Banner */}
<div className="bg-amber-500/10 border-b border-amber-500/20 py-2">
  <div className="container mx-auto px-4">
    <p className="text-xs text-amber-700 dark:text-amber-300 text-center flex items-center justify-center gap-2">
      <AlertTriangle className="h-3 w-3" />
      Mode développement : Authentification désactivée. Sélectionnez manuellement le chef de chantier.
    </p>
  </div>
</div>
```

Après suppression, le `<PageHeader>` suivra directement le `<AppNav />`.

## Impact

- Supprime le message trompeur en production
- Aucun impact fonctionnel (c'était purement cosmétique)
- L'authentification reste entièrement fonctionnelle (protégée par `RequireAuth`)

