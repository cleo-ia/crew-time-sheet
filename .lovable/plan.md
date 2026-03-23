

## Plan : Harmoniser la protection des statuts avances (4 endroits restants)

### Fichier : `supabase/functions/sync-planning-to-teams/index.ts`

Les lignes 740, 898 et 1786 sont deja corrigees avec la liste complete. Reste 4 endroits encore a `['CLOTURE']` seul.

---

### Modification 1 — Suppression macon hors planning (ligne 1180)

```
Avant :  const STATUTS_PROTEGES_CHEF = ['CLOTURE']
Apres :  const STATUTS_PROTEGES_CHEF = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
```

Si le planning change en cours de semaine et qu'un macon est retire d'un chantier, sa fiche deja signee/transmise ne sera pas supprimee.

---

### Modification 2 — Suppression finisseur hors planning (ligne 1230)

```
Avant :  const STATUTS_PROTEGES_FINISSEUR = ['CLOTURE']
Apres :  const STATUTS_PROTEGES_FINISSEUR = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
```

Meme logique pour les finisseurs.

---

### Modification 3 — Fiches orphelines (ligne 1334)

```
Avant :  const STATUTS_PROTEGES_ORPHAN = ['CLOTURE']
Apres :  const STATUTS_PROTEGES_ORPHAN = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
```

Une fiche orpheline (plus dans le planning) mais deja signee/transmise ne sera pas supprimee.

---

### Modification 4 — Anti-doublon fiches_jours (ligne 1457)

```
Avant :  if (entry.statut === 'CLOTURE') continue // Protéger
Apres :  if (['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE'].includes(entry.statut)) continue // Protéger
```

Les fiches_jours en doublon sur des fiches signees/transmises ne seront pas supprimees.

---

### Scenario concret

Vendredi le chef signe les fiches (VALIDE_CHEF). Le conducteur modifie le planning pour la meme semaine et relance une sync manuelle. Sans ce correctif, les fiches signees du macon/finisseur retire du planning seraient supprimees. Avec ce correctif, elles sont preservees.

### Pas de regression

- Fiches BROUILLON : pas dans la liste → supprimees/ecrasees normalement comme avant
- Fiches CLOTURE : deja protegees, restent protegees
- Les 3 autres blocs (lignes 740, 898, 1786) : deja corriges, coherence totale

