
Objectif

Reprendre `InventoryTemplatesManager` pour qu’une catégorie nouvellement créée soit d’abord un grand conteneur vide, puis permette d’ajouter les matériels un par un via un bouton `+`, exactement comme tu le décris.

Constat sur le code actuel

- Le composant affiche déjà les catégories en cartes.
- Le problème vient de l’UX d’ajout :
  - le formulaire `Input + unité + Ajouter` est toujours visible en bas de chaque carte
  - il n’y a pas de mode “catégorie vide puis ajout progressif”
- Donc le correctif doit être centré sur `src/components/admin/InventoryTemplatesManager.tsx`.

Ce que je vais faire

1. Garder la création de catégorie telle qu’elle est
- Quand on crée une catégorie, elle apparaît bien comme une grande card avec son bandeau.
- Si elle n’a encore aucun matériel, elle reste vide de lignes.

2. Remplacer le formulaire toujours visible par un vrai flux “bouton +”
- Sous le bandeau de chaque catégorie, afficher seulement un bouton `+ Ajouter un matériel`.
- Au clic :
  - ouvrir une ligne de saisie inline dans cette catégorie uniquement
  - champs : désignation + unité
- Tant que rien n’a été ajouté, on ne voit pas de liste de matériels.

3. Afficher les matériels seulement après ajout
- Une fois un matériel créé :
  - il apparaît dans la carte comme une vraie ligne
  - en dessous, on retrouve à nouveau un bouton `+ Ajouter un matériel`
- Résultat :
  - catégorie vide au départ
  - puis accumulation progressive des lignes ajoutées

4. Gérer l’état d’édition par catégorie
- Ajouter un état du type `openAddFormByCategory`
- Une seule catégorie peut ouvrir son formulaire d’ajout à la fois, ou bien une gestion simple par catégorie selon la structure actuelle
- Après ajout réussi :
  - vider les champs
  - refermer le formulaire
  - laisser le bouton `+` réapparaître sous la liste

5. Conserver les actions utiles déjà en place
- Garder :
  - renommage de catégorie
  - suppression de catégorie
  - suppression d’un matériel
  - ordre des matériels dans une catégorie
  - unité via `Select`
- Ne pas toucher aux hooks Supabase sauf si besoin de raccord mineur.

6. Ajuster le rendu visuel
- Garder le style actuel propre et léger
- Faire en sorte que la card grandisse naturellement avec la liste
- Prévoir un état vide lisible dans la carte, par exemple :
  - “Aucun matériel pour le moment”
  - puis le bouton `+` juste en dessous

Fichiers concernés

- `src/components/admin/InventoryTemplatesManager.tsx` : refonte ciblée de l’UX des cards
- `src/hooks/useInventoryTemplates.ts` : probablement inchangé

Comportement attendu après correction

- Je crée `EPI & Sécurité`
- La card s’affiche avec seulement le header + un bouton `+ Ajouter un matériel`
- Je clique sur `+`
- Une ligne de saisie apparaît
- Je crée `Gants`
- La ligne `Gants - Paire` apparaît
- Le formulaire disparaît
- Un nouveau bouton `+ Ajouter un matériel` reste disponible en dessous pour enchaîner

Détails techniques

- Remplacer le bloc actuel “Inline add form” par un rendu conditionnel :
  - si formulaire fermé : bouton `+`
  - si formulaire ouvert : `Input + Select + boutons Valider/Annuler`
- Continuer d’utiliser `virtualCategories` pour afficher immédiatement les catégories vides avant leur premier matériel
- Lister les `items` au-dessus de la zone d’ajout, avec croissance verticale naturelle de la `Card`

Risque de régression

- Faible
- Le changement est localisé à l’interface de `InventoryTemplatesManager`
- Les hooks CRUD existants restent compatibles
