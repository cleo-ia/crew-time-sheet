

## Restaurer le tri par rôle puis alphabétique — Vue consolidée RH

### Modification unique — `src/hooks/rhShared.ts` (lignes 974-978)

Remplacer le tri alphabétique pur par un tri à deux niveaux :

**Niveau 1** — Priorité par rôle/métier :
1. Chef
2. Maçon
3. Grutier
4. Finisseur
5. Intérimaire

**Niveau 2** — Alphabétique (nom puis prénom) au sein de chaque groupe.

### Détail technique

Ajouter une map de priorité :
```text
chef → 1, macon → 2, grutier → 3, finisseur → 4, interimaire → 5
```

Dans le `.sort()` final, comparer d'abord la priorité du rôle, puis `nom.localeCompare` + `prenom.localeCompare` en cas d'égalité.

### Ce qui ne change pas
- Affichage "Prénom NOM" inchangé
- Aucun impact sur données, exports, fiches, congés, ALD
- Un seul fichier modifié, ~10 lignes

