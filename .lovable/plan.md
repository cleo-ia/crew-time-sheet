

## Probleme identifie

Pour les chefs multi-chantier, la vue RH detail (`useRHEmployeeDetail`) a 3 bugs :

1. **Filtre chantier trop strict** (lignes 622-624) : la requete SQL filtre par `chantier_id`, donc quand on filtre par chantier "test", les fiches du chantier "test 2" sont exclues. Le chef apparait alors avec 0h certains jours.

2. **Deduplication qui perd des heures** (lignes 802-820) : quand il y a 2 entrees pour la meme date (une par chantier), la logique garde une seule entree au lieu de sommer les heures. Resultat : 35h au lieu de 39h.

3. **Faux "Absent"** : un chef avec 0h sur le chantier filtre mais des heures sur un autre chantier est marque absent (fond rouge + badge "Absent") dans la table detail et dans le dialog semaine.

---

## Corrections prevues

### Fichier 1 : `src/hooks/useRHData.ts` (useRHEmployeeDetail)

**A. Charger toutes les fiches pour les chefs (sans filtre chantier)**
- Lignes 618-624 : au lieu d'appliquer le filtre `chantier_id` directement dans la requete, on le retire pour les chefs. On detecte d'abord si le salarie est chef via une requete rapide sur `chantiers.chef_id`, puis on charge toutes ses fiches si c'est un chef.

**B. Sommer les heures par jour au lieu de dedupliquer**
- Lignes 802-820 : pour les chefs, la logique de deduplication est remplacee par une sommation : heures normales additionnees, heures intemperies additionnees, panier et trajet fusionnes (OR logique), et on conserve une liste de tous les chantiers du jour.
- Un nouveau champ `autresChantiersCodes` sera ajoute a chaque entree pour stocker les codes des autres chantiers travailles ce jour-la.

**C. Ne pas compter comme absence pour les chefs**
- Lignes 776-777 : le champ `isAbsent` sera mis a `false` pour les chefs quand ils ont des heures sur un autre chantier ce meme jour.

### Fichier 2 : `src/components/rh/RHEmployeeDetail.tsx`

**A. Afficher "Sur chantier X" au lieu de "Absent"**
- Ligne 342 : la variable `isAbsent` pour les chefs prendra en compte si le chef a travaille sur un autre chantier. Si `heuresNormales === 0` mais que l'entree indique un autre chantier, le fond rouge est remplace par un fond bleu/neutre.
- Ligne 361 : le fond rouge conditionnel `bg-red-50/30` ne s'appliquera pas pour les chefs sur un autre chantier.
- Lignes 367-373 : la colonne "Chantier" affichera le code du chantier ou le chef a travaille ce jour quand il est filtre sur un autre chantier.

### Fichier 3 : `src/components/rh/RHWeekDetailDialog.tsx`

**A. Meme correction "Sur chantier X"**
- Lignes 115-141 : le badge "Absent" est remplace par un badge bleu "Sur [CODE]" quand le chef a 0h localement mais un `chantierCode` renseigne indiquant qu'il etait sur un autre site.

---

## Details techniques

Le nouveau champ ajoute dans le retour de `dailyDetails` :

```text
{
  ...existant,
  isOnOtherSite: boolean,        // true si chef avec 0h ici mais heures ailleurs
  otherSiteCode: string | null,  // code du chantier ou il travaillait
}
```

La sommation pour les chefs se fait ainsi :
- On groupe tous les `dailyDetails` par date
- Pour chaque date, on somme `heuresNormales` et `heuresIntemperies`
- On fait un OR sur `panier` et `trajetPerso`
- On garde le `codeTrajet` non-null le plus pertinent
- On concatene les noms/codes de chantiers

Quand un filtre chantier est actif et que le chef a 0h sur ce chantier mais des heures sur un autre : `isOnOtherSite = true` et `otherSiteCode` = code de l'autre chantier.

