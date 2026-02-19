
# Correction : Jours d'affectation non filtrés par chantier dans TimeEntryTable

## Problème

Le regroupement des finisseurs par chantier fonctionne (BOUSHABI apparait sous AMBERIEU et VILOGIA), mais le composant `TimeEntryTable` recoit **toutes les affectations** du finisseur (5 jours) au lieu de seulement celles du chantier concerne.

La ligne fautive est dans `ValidationConducteur.tsx` (ligne 869) :

```text
affectationsJours={affectationsJours?.filter(a => 
  chantierFinisseurs.some(f => f.id === a.finisseur_id)
)}
```

Ce filtre ne garde que les affectations des bons finisseurs, mais ne filtre PAS par `chantier_id`. Resultat : BOUSHABI sous VILOGIA recoit ses 5 jours (L/M/J d'AMBERIEU + Me/V de VILOGIA), d'ou les 39h affiches au lieu de 15h.

C'est exactement la meme logique que pour les chefs multi-site, ou `useAffectationsJoursByChefAndChantier` filtre par `chantier_id`.

## Solution

### Fichier : `src/pages/ValidationConducteur.tsx`

**Ligne 869** : Ajouter un filtre `chantier_id` sur les affectations passees a `TimeEntryTable` :

```text
Avant:
  affectationsJours?.filter(a => 
    chantierFinisseurs.some(f => f.id === a.finisseur_id)
  )

Apres:
  affectationsJours?.filter(a => 
    chantierFinisseurs.some(f => f.id === a.finisseur_id) &&
    (chantierId === "sans-chantier" || a.chantier_id === chantierId)
  )
```

Cela garantit que `TimeEntryTable` ne voit que les jours affectes a CE chantier, et `getVisibleDaysForFinisseur` n'affichera que ces jours-la (L/M/J pour AMBERIEU, Me/V pour VILOGIA).

### Impact

- AMBERIEU : BOUSHABI verra uniquement L/M/J, total 31h (jours Me/V masques/non editables)
- VILOGIA : BOUSHABI verra uniquement Me/V, total 15h (jours L/M/J masques/non editables)
- Comportement identique a ce que font les chefs multi-site (jours non affectes en jaune pale, non saisissables)
- La sauvegarde par chantier (`useSaveChantierManuel`) filtre deja correctement par `chantier_id` (ligne 897-899), donc pas de changement necessaire la
