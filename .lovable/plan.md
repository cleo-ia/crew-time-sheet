

# Corriger le compteur d'absences du chef multi-chantier dans la vue conducteur

## Le probleme

Sur la page de validation conducteur, quand on ouvre le detail d'une fiche, le tableau recapitulatif affiche "2" dans la colonne "Absences" pour le chef Thomas. Or il n'est pas absent : il est simplement sur son autre chantier ces jours-la.

C'est le meme probleme que sur la page de signatures, mais dans un composant different.

## La solution

Dans la fonction `calculateEmployeeSummary()` du fichier `FicheDetail.tsx`, ne pas compter les jours a 0h comme des absences quand l'employe est le chef de chantier (car un chef multi-chantier peut avoir 0h sur un site certains jours).

## Fichier a modifier

**`src/components/validation/FicheDetail.tsx`** - fonction `calculateEmployeeSummary()` (lignes 445-450)

### Avant

```typescript
// Absences = jours ou HNORM = 0 ET HI = 0 ET trajet_perso = false
const totalAbsences = fiche.fiches_jours?.filter((fj: any) => {
  const heures = Number(fj.HNORM || fj.heures || 0);
  const intemperie = Number(fj.HI || 0);
  return heures === 0 && intemperie === 0 && fj.trajet_perso !== true;
}).length || 0;
```

### Apres

```typescript
// Absences = jours ou HNORM = 0 ET HI = 0 ET trajet_perso = false
// Pour le chef multi-chantier, ne pas compter les jours a 0h comme absences
const isChef = fiche.salarie?.id === ficheData?.chef?.id;
const totalAbsences = isChef ? 0 : (fiche.fiches_jours?.filter((fj: any) => {
  const heures = Number(fj.HNORM || fj.heures || 0);
  const intemperie = Number(fj.HI || 0);
  return heures === 0 && intemperie === 0 && fj.trajet_perso !== true;
}).length || 0);
```

## Resultat

| Qui | 0h certains jours | Avant | Apres |
|-----|-------------------|-------|-------|
| Chef Thomas (multi-chantier) | Sur l'autre chantier | "2" absences | "-" (pas d'absence) |
| Employe normal | Vraiment absent | Nombre d'absences | Pas de changement |
