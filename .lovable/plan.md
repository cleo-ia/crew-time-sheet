

## Analyse des incohérences actuelles

Trois problèmes distincts a corriger :

### Probleme 1 : Detail sans filtre chantier - pas de visibilite multi-site
Quand on ouvre le detail d'un chef sans filtre chantier, on voit `8h` sur une seule ligne par jour, mais on ne sait pas que c'est `4h CI000 + 4h CI002`. L'utilisateur veut voir le detail par chantier dans la colonne "Chantier" et "Heures".

### Probleme 2 : Detail avec filtre chantier - les totaux ne correspondent pas au consolide
Le consolide (rhShared.ts) filtre les fiches par chantier au niveau SQL, donc il montre 27h pour CI002. Mais le detail (useRHData.ts) charge TOUTES les fiches du chef sans filtre, donc il montre 39h. L'option A choisie dit : les totaux doivent correspondre au chantier filtre.

### Probleme 3 : Consolide - fausses absences pour les chefs
Dans rhShared.ts, quand on filtre par chantier CI000, un jour ou le chef a fait 0h sur CI000 mais 8h sur CI002 est compte comme "absent" (ligne 535-538). Pour les chefs, ce n'est pas une absence.

---

## Corrections prevues

### Fichier 1 : `src/hooks/useRHData.ts` - useRHEmployeeDetail

**Logique actuelle** : charge toutes les fiches du chef, somme tout, totaux = global.

**Nouvelle logique** :
- Charger TOUTES les fiches du chef (comme maintenant) pour avoir la visibilite complete.
- Pour chaque jour, garder le detail par chantier : quels chantiers, combien d'heures sur chacun.
- **Sans filtre chantier** : afficher 1 ligne par jour avec le detail dans la colonne Chantier (ex: `4h CI000 + 4h CI002`), et les totaux = somme globale (39h).
- **Avec filtre chantier** : les totaux (summary) ne comptent QUE les heures du chantier filtre. La ligne du jour affiche les heures du chantier filtre. Les jours ou le chef etait sur un autre chantier montrent "Sur CI002" avec 0h dans les heures (pas d'etiquette "Absent").

Concretement dans le code :
- Ajouter un champ `siteDetails: Array<{ code: string; nom: string; heures: number }>` a chaque jour pour stocker la repartition.
- Le champ `heuresNormales` de la ligne = heures du chantier filtre (ou total si pas de filtre).
- Le champ `isOnOtherSite` = true quand il y a 0h sur le chantier filtre mais des heures ailleurs.
- Le champ `otherSiteCode` = code du chantier ou il a travaille.
- Le `summary.totalHeures` ne compte que les heures du chantier filtre (ou global si pas de filtre).
- Idem pour paniers et trajets : ceux du chantier filtre uniquement.

### Fichier 2 : `src/components/rh/RHEmployeeDetail.tsx`

**Sans filtre chantier** :
- Colonne "Chantier" affiche le detail multi-site : `CI000 (4h) + CI002 (4h)` ou format similaire.
- La colonne "H. Normales" affiche le total du jour (8h).

**Avec filtre chantier** :
- Jours sur le chantier filtre : affichage normal.
- Jours sur un autre chantier (`isOnOtherSite`) : badge bleu "Sur CI002" dans la colonne Chantier, 0h dans les heures, pas de fond rouge, pas compte comme absence.

La weekly summary (cartes semaine) utilise les memes donnees donc sera coherente.

### Fichier 3 : `src/hooks/rhShared.ts` - buildRHConsolidation

**Correction absences chefs** :
- Ligne 535-538 : pour les chefs, quand `isAbsent` est vrai (0h apres sommation), il faut verifier s'il existe d'autres fiches pour ce chef a cette date sur d'autres chantiers.
- Comme `rhShared.ts` filtre les fiches par chantier au niveau SQL (ligne 244-246), les fiches des autres chantiers ne sont pas chargees. Il faut donc faire une requete supplementaire pour les chefs : verifier si `fiches_jours` existe pour ce salarie a cette date, toutes fiches confondues.
- Si oui, `isAbsent = false` et `absences` n'est pas incremente.
- Le `detailJours.chantierCode` pour ce jour indique le code de l'autre chantier (pour info).

### Fichier 4 : `src/components/rh/RHWeekDetailDialog.tsx`

Deja en place : le composant gere `isOnOtherSite` et affiche "Sur [CODE]". Les donnees corrigees en amont feront que tout s'affiche correctement.

---

## Resume des changements

```text
Fichier                          | Changement
---------------------------------|---------------------------------------------
src/hooks/useRHData.ts           | Detail : totaux filtres par chantier,
                                 | siteDetails par jour, isOnOtherSite
src/components/rh/               | Affichage multi-site "CI000 (4h) + CI002 (4h)"
  RHEmployeeDetail.tsx           | et badge "Sur X" avec filtre
src/hooks/rhShared.ts            | Consolide : ne pas compter absent pour chef
                                 | si heures sur autre chantier
src/components/rh/               | Deja gere (isOnOtherSite)
  RHWeekDetailDialog.tsx         |
```

