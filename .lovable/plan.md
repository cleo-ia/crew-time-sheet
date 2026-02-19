

# Correction : Charger TOUTES les fiches d'un finisseur multi-chantier

## Probleme

Le hook `useFinisseursByConducteur` ne charge qu'**une seule fiche** par finisseur (celle du "chantier prefere" = `affectedDays[0]`). Pour un finisseur comme BOUSHABI affecte a 2 chantiers (AMBERIEU L/M/J + VILOGIA Me/V), seule la fiche d'un chantier est chargee. L'autre chantier apparait dans "Mes heures" mais avec 0h et aucune donnee de jours.

**Donnees en base (correctes) :**
- Fiche AMBERIEU : 31h (3 jours)
- Fiche VILOGIA : 15h (2 jours)
- Affectations : 5 jours repartis entre les 2 chantiers

**Ce qui est affiche (incorrect) :**
- AMBERIEU : 39h, 5 jours
- VILOGIA : 39h, 5 jours

## Solution

### Fichier : `src/hooks/useFinisseursByConducteur.ts` (lignes 90-154)

Remplacer la logique "selectionner UNE fiche" par "charger TOUTES les fiches" :

1. Recuperer toutes les fiches du finisseur pour la semaine (pas juste une)
2. Pour chaque fiche, charger ses ficheJours
3. Fusionner tous les ficheJours dans un seul tableau sur le finisseur
4. Calculer totalHeures comme la somme de toutes les fiches
5. Verifier les signatures sur toutes les fiches

Concretement :

```text
Avant (lignes 92-154):
  preferredChantierId = affectedDays[0]?.chantier_id
  fiche = fichesEmploye.find(f => f.chantier_id === preferredChantierId)
  ficheJours = fiches_jours WHERE fiche_id = fiche.id  // UNE seule fiche

Apres:
  allFiches = fiches WHERE semaine + salarie_id  // TOUTES les fiches
  allFicheJours = []
  pour chaque fiche:
    jours = fiches_jours WHERE fiche_id = fiche.id
    allFicheJours.push(...jours)
  finisseur.ficheJours = allFicheJours  // Fusion de toutes les fiches
  finisseur.totalHeures = sum(allFiches.total_heures)
  finisseur.hasSigned = toutes les fiches ont une signature
```

Ensuite le regroupement par chantier deja en place dans `ValidationConducteur.tsx` filtrera correctement les ficheJours par dates d'affectation, donnant les bons totaux par chantier.

### Aucun autre fichier a modifier

Le regroupement dans `ValidationConducteur.tsx` (corrige precedemment) fonctionne deja : il filtre `ficheJours` par les dates de chaque chantier. Le seul probleme etait que les ficheJours de l'autre chantier n'etaient jamais chargees.

## Resultat attendu

- AMBERIEU : BOUSHABI 31h (L/M/J uniquement)
- VILOGIA : BOUSHABI 15h (Me/V uniquement)
- Fiche de trajet scopee par chantier
