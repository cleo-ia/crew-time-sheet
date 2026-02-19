
# Correction : Vendredi AMBERIEU visible sous VILOGIA

## Probleme

Le composant `TimeEntryTable` charge ses propres donnees via `useFinisseursByConducteur` (ligne 241), qui retourne TOUS les `ficheJours` de toutes les fiches de l'employe. Quand il construit les entrees (lignes 401-448), il itere sur tous les `ficheJours` sans filtrer par chantier. Resultat : le Vendredi avec `code_chantier_du_jour = AMBERIEU` apparait sous le groupe VILOGIA.

Le filtre `getVisibleDaysForFinisseur` (ligne 167) controle quels jours sont **affiches dans l'UI**, mais les donnees sont deja chargees dans le state `entries` avec les valeurs du mauvais chantier.

## Solution

### Fichier : `src/components/timesheet/TimeEntryTable.tsx` (lignes 401-448)

Filtrer les `ficheJours` par les dates presentes dans `affectationsJours` AVANT de les appliquer aux entrees, en mode conducteur uniquement.

Concretement, a la ligne 401 :

```text
Avant:
  if (finisseur.ficheJours) {
    finisseur.ficheJours.forEach(j => {
      // applique TOUS les ficheJours

Apres:
  if (finisseur.ficheJours) {
    // En mode conducteur, ne garder que les ficheJours dont la date
    // correspond a une affectation dans affectationsJours (deja filtre par chantier)
    const visibleDates = new Set(
      (affectationsJours || [])
        .filter(a => a.finisseur_id === finisseur.id)
        .map(a => a.date)
    );
    const filteredJours = isConducteurMode && visibleDates.size > 0
      ? finisseur.ficheJours.filter(j => visibleDates.has(j.date))
      : finisseur.ficheJours;
    
    filteredJours.forEach(j => {
      // applique seulement les ficheJours du chantier concerne
```

Comme `affectationsJours` est deja filtre par `chantier_id` dans `ValidationConducteur.tsx` (ligne 869-872), les dates visibles correspondent exactement aux jours de CE chantier. Les ficheJours d'AMBERIEU (Vendredi) ne seront pas charges sous VILOGIA.

### Impact

- Vendredi ne s'affichera plus sous VILOGIA avec le code AMBERIEU
- Les donnees initiales de chaque jour correspondent au bon chantier
- Le total 15h restera correct (seuls Me/V de VILOGIA sont charges)
- Aucun changement en base de donnees
- La fiche de trajet (5/5 jours) est un probleme separe lie au composant `TransportSheetV2` qui ne filtre pas par affectations
