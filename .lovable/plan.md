

## Plan : Supprimer `copyFichesFromPreviousWeek` et proteger les statuts avances

### Fichier : `supabase/functions/sync-planning-to-teams/index.ts`

5 modifications dans un seul fichier. Aucun changement cote client.

---

### Modification 1 — Supprimer le fetch S-1 (lignes 490-524)

Supprimer les 2 requetes `affectationsS1Chef` / `affectationsS1Finisseurs` et le groupement `s1ByEmployeChantier`. Ces donnees ne servaient qu'a comparer S vs S-1 pour decider de copier ou creer.

---

### Modification 2 — Proteger les statuts avances dans le bloc chef secondaire (ligne 774)

```
Avant :  const STATUTS_PROTEGES = ['CLOTURE']
Apres :  const STATUTS_PROTEGES = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
```

Et a la ligne 870, ne plus forcer `statut: 'BROUILLON'` si la fiche est deja protegee (la fiche existante est deja chargee ligne 765-771, on reutilise `ficheSecondaire.statut`).

---

### Modification 3 — Remplacer le branchement copy/create (lignes 1022-1066)

Supprimer le `if (isIdentique) { copyFiches... } else { createNewAffectation... }` et appeler directement `createNewAffectation` dans tous les cas. Le compteur `stats.copied` reste dans l'objet stats (a 0) pour ne pas casser le code amont qui le lit (ligne 156).

---

### Modification 4 — Proteger les statuts avances dans `createNewAffectation` (lignes 2040-2055)

Remplacer le check `CLOTURE` seul par la liste complete. Quand un statut protege est detecte :
- Ne pas supprimer les `fiches_jours`
- Ne pas modifier le `statut` ni le `total_heures`
- Quand meme creer les `affectations_jours_chef` / `affectations_finisseurs_jours` (visibilite equipe)
- Incrementer `stats.protected` via le retour `{ created: false, reason: 'Fiche protegee (STATUT)' }`

---

### Modification 5 — Supprimer `copyFichesFromPreviousWeek` et `arraysEqual` (lignes 1793-2017 et 2244-2247)

Supprimer entierement ces deux fonctions devenues inutiles.

---

### Pas de regression

- **Macons, grutiers, interimaires** : passent par `createNewAffectation` comme avant quand le planning changeait. Maintenant ils y passent systematiquement → initialisation 39h standard.
- **Chantiers ecole** : logique `is_ecole` preservee dans `createNewAffectation` (7h/jour, pas de trajet/panier).
- **2CB, PAM** : notifications conducteurs passifs inchangees (lignes 164+), creation de fiches via le meme chemin standard.
- **Chef multi-chantier** : la protection statut s'applique aussi au bloc chef secondaire (ligne 774).
- **Fiches BROUILLON** : toujours ecrasees par le planning (comportement identique).
- **Fiches signees/transmises** : desormais protegees, seules les affectations equipe sont creees.
- **Code client** : aucun changement necessaire.

