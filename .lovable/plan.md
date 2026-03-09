

## Analyse de risque des 4 corrections

### Fix 1 — Ligne 1641 : `for (let i = 0; i < 5; i++)` → `for (const jour of joursPlanning)`

**Contexte :** Fiche protégée (heures > 0) sur chantier chef. Crée les affectations pour la visibilité équipe.

**Risque : AUCUN.** La fonction `createNewAffectation` (ligne 1891) fait déjà exactement cela pour le même cas de figure (fiche protégée + chef). C'est un simple alignement de `copyFichesFromPreviousWeek` sur le comportement déjà correct de `createNewAffectation`.

---

### Fix 2 — Ligne 1763 : Supprimer le `if (chantier?.conducteur_id)`

**Contexte :** Après copie des fiches_jours de S-1, supprime les jours hors planning.

**Risque : AUCUN.** Vérifié les cas limites :
- Employé 5j sur un chantier chef en S-1, même 5j en S → `datesToDelete` est vide → aucune suppression
- Employé 5j en S-1, 3j en S → supprime les 2 jours excédentaires → comportement attendu
- `allWeekDates` ne couvre que lundi-vendredi → pas de risque sur des entrées weekend

C'est exactement ce que fait déjà le code pour les conducteurs. On étend simplement le même nettoyage aux chefs.

---

### Fix 3 — Ligne 1811 : `for (const jour of jours)` → `for (const jour of joursPlanning)`

**Contexte :** Création des affectations_jours_chef après copie.

**Risque : AUCUN.** `jours` est construit depuis les fiches_jours de S-1 (qui peuvent avoir des entrées excédentaires). `joursPlanning` vient directement du planning validé (source de vérité). La fonction `createNewAffectation` utilise déjà `joursPlanning` (ligne 1891). Même alignement que Fix 1.

**Cas `isIdentique=true` :** Le planning S = planning S-1, donc `joursPlanning` contient les mêmes jours que `affS1.jours`. Mais `joursS1` (fiches_jours réelles) pourrait avoir des entrées supplémentaires de bugs passés. Utiliser `joursPlanning` est strictement plus sûr.

---

### Bonus — Ligne 1787 : Filtrer total_heures par `joursPlanning` aussi pour les chefs

**Contexte :** Calcul du total_heures de la fiche copiée.

**Risque : AUCUN.** Un trigger Postgres (`recalculate_fiche_total_heures`) recalcule automatiquement le total à chaque modification de fiches_jours. Donc même si on calcule mal ici, le trigger corrige. De plus, avec Fix 2 qui supprime les jours fantômes AVANT ce calcul, le total serait correct de toute façon.

---

### Synthèse

Les 4 corrections alignent `copyFichesFromPreviousWeek` (chantiers chef) sur le comportement déjà en production et fonctionnel de :
- `createNewAffectation` (utilise déjà `joursPlanning` partout)
- `copyFichesFromPreviousWeek` pour les chantiers conducteur (nettoyage déjà actif)

Aucun nouveau pattern n'est introduit. On supprime 3 incohérences entre chef et conducteur dans une seule fonction. Zero risque de régression.

