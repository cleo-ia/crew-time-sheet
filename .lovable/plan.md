

## Appliquer un orange pastel léger sur le bandeau d'en-tête du tableau récap inventaire

### Ce qui change

Le bandeau d'en-tête du tableau (ligne 544) passe de :
- **Avant** : fond orange vif `#ea580c` + texte blanc
- **Après** : fond orange pastel très léger (ex: `#FFF3E8` ou `#FDEAD7`) + texte foncé (noir/gris)

### Fichier modifié

**`src/pages/InventaireRecap.tsx`** — ligne 544 :
- Changer `backgroundColor: "#ea580c"` → `backgroundColor: "#FFF3E8"` (orange pastel très léger)
- Changer `color: "#ffffff"` → `color: "#1a1a1a"` (texte foncé pour lisibilité)
- Les pastilles colorées (vert, orange, rouge) restent inchangées

Un seul changement de style sur une seule ligne.

