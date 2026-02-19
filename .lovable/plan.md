
# Correction : Finisseur multi-chantier invisible dans "Mes heures"

## Probleme identifie

Quand un finisseur (ex: BOUSHABI) est affecte a **2 chantiers differents** dans la meme semaine (AMBERIEU L/M/J + VILOGIA Me/V), le code actuel le place sous **un seul** chantier (le premier de sa liste `affectedDays`). Le second chantier n'apparait jamais dans la vue "Mes heures".

Le bug se situe dans `ValidationConducteur.tsx` (lignes 266-280) :
```text
finisseursByChantier = groupBy(finisseur => affectedDays[0]?.chantier_id)
```
Chaque finisseur n'apparait que sous UN chantier, meme s'il est affecte a plusieurs.

## Solution

Modifier le regroupement pour qu'un finisseur apparaisse sous **chaque chantier** ou il a au moins un jour affecte.

### Fichier 1 : `src/pages/ValidationConducteur.tsx`

**Modifier `finisseursByChantier`** (lignes 266-280) : au lieu de grouper par `affectedDays[0]`, iterer sur tous les `affectedDays` et creer une entree par chantier unique.

Pour chaque chantier, le finisseur aura ses `affectedDays` filtres pour ne contenir que les jours de CE chantier. Cela garantit que :
- AMBERIEU affiche BOUSHABI avec L/M/J uniquement
- VILOGIA affiche BOUSHABI avec Me/V uniquement
- Les heures affichees sont correctement scopees par chantier

**Modifier `finisseursEquipeByChantier`** (lignes 286-299) : adapter pour utiliser le meme decoupage, en filtrant les `ficheJours` par les dates du chantier concerne.

### Fichier 2 : `src/hooks/useFinisseursByConducteur.ts`

Aucun changement structurel necessaire. Le hook retourne deja tous les `affectedDays` avec le `chantier_id` pour chaque jour. La logique de separation se fait cote composant.

### Detail technique

Remplacement du code de regroupement :

```text
Avant:
  finisseur -> affectedDays[0].chantier_id -> 1 seul groupe

Apres:
  finisseur -> pour chaque chantier_id unique dans affectedDays :
    - creer une copie du finisseur
    - filtrer affectedDays pour ce chantier uniquement
    - filtrer ficheJours pour les dates de ce chantier uniquement
    - recalculer totalHeures a partir des ficheJours filtres
```

Cela corrige aussi les totaux d'heures affiches (actuellement BOUSHABI affiche 39h sous VILOGIA alors qu'il ne fait que 15h sur ce chantier).

## Impact

- Correction de l'affichage des chantiers manquants
- Correction des totaux d'heures par chantier
- La fiche de trajet par chantier fonctionnera correctement
- Aucun changement en base de donnees necessaire
