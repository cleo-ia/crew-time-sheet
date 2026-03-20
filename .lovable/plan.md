

## Correction de l'erreur de build — attributs dupliqués

### Diagnostic

Les fichiers `main.tsx` et `App.tsx` sont **déjà propres** dans le code source. L'erreur vient du plugin `lovable-tagger` qui injecte deux fois les attributs `data-lov-*` et `data-component-*` lors de la transformation Vite.

### Garantie zéro régression

La correction consiste uniquement à **réécrire les deux fichiers à l'identique** (même contenu exact). Cela force le système de build à invalider le cache du tagger et à réinjecter les attributs une seule fois.

- Aucune ligne de code modifiée
- Aucune logique modifiée
- Aucune route, import, ou configuration touchée
- Le contenu final sera strictement identique à l'actuel

### Fichiers concernés

1. **`src/main.tsx`** — réécriture identique (19 lignes)
2. **`src/App.tsx`** — réécriture identique (182 lignes)

C'est un "touch" des fichiers, rien de plus.

