
# Adapter le bandeau multi-chantier au texte de reference

## Modification

**Fichier** : `src/pages/Index.tsx` (lignes 535-540)

Remplacer le message actuel (un seul paragraphe condense) par un texte structure qui reprend fidelement le contenu du screen 2 :

```
Chef multi-chantier : nouveau fonctionnement de la saisie

Vous etes affecte sur plusieurs chantiers. Vos heures sur le chantier secondaire
sont desormais initialisees a 0h par defaut (panier et trajet decoches).
Vous pouvez les modifier librement.

Attention a ne pas compter vos heures en double !

Si vous saisissez des heures sur votre chantier secondaire un jour donne,
pensez a ajuster le meme jour sur votre chantier principal :

- Exemple : Vous travaillez 4h sur le chantier A (principal) et 4h sur le
  chantier B (secondaire) le lundi -> saisissez bien 4h sur A et 4h sur B,
  pas 8h sur les deux.

- Meme principe pour les paniers et trajets : ne cochez le panier ou le trajet
  que sur un seul des deux chantiers pour ce jour-la.

En resume : le total de vos heures par jour, tous chantiers confondus,
doit correspondre a votre journee reelle de travail.
```

Le bandeau conserve le style bleu actuel (`Alert` avec `border-blue-500/50 bg-blue-500/10`) et l'icone `Info`. Le texte sera structure avec des balises HTML (`<strong>`, `<p>`, `<ul>`, `<li>`) pour une meilleure lisibilite.
