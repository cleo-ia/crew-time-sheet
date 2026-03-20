

## Correction du build error "Duplicate data-lov-id" dans main.tsx et App.tsx

### Problème
Le système Lovable a dupliqué ses attributs internes (`data-lov-id`, `data-lov-name`, etc.) dans `main.tsx` et `App.tsx`, ce qui bloque le build.

### Solution
Réécrire proprement `main.tsx` et `App.tsx` avec leur contenu exact actuel, sans aucune modification de logique — juste un "nettoyage" pour que le système Lovable réinjecte correctement ses attributs une seule fois.

### Fichiers modifiés
1. **`src/main.tsx`** — Réécriture identique (même imports, même logique PWA, même render)
2. **`src/App.tsx`** — Réécriture identique (même routes, même providers, même rôles)

### Risque de régression
**Zéro.** Le code source ne change pas du tout. Seuls les attributs invisibles injectés automatiquement par Lovable sont nettoyés.

