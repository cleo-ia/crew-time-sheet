

## Lignes de catégorie séparées dans le tableau récap inventaire

### Changement (1 fichier)

**`src/pages/InventaireRecap.tsx`** — modifier le rendu du `<tbody>` :

- Pour chaque catégorie, insérer d'abord une **ligne dédiée** avec un `<td colSpan={5}>` affichant le nom de la catégorie en gras, fond légèrement coloré (ex: `bg-muted`), style bandeau de section.
- Ensuite, afficher les lignes d'articles **sans** la colonne catégorie répétée (la première colonne reste vide ou est supprimée pour ces lignes).

### Résultat visuel

```text
┌──────────────────────────────────────────────────────────────────┐
│  EPI & Sécurité                                                  │  ← ligne pleine largeur, fond coloré
├──────────┬─────────────────────┬────────┬──────────┬─────────────┤
│          │ botte               │   U    │    14    │             │
│          │ Bouchons d'oreilles │ Boîte  │    20    │             │
│          │ Masque FFP3         │ Boîte  │    10    │             │
├──────────────────────────────────────────────────────────────────┤
│  Manutention & Levage                                            │  ← ligne pleine largeur
├──────────┬─────────────────────┬────────┬──────────┬─────────────┤
│          │ Diable manutention  │   U    │     3    │             │
│          │ Élingue de levage   │   U    │     7    │             │
└──────────┴─────────────────────┴────────┴──────────┴─────────────┘
```

