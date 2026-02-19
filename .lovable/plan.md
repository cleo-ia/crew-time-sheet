

# Corriger le calcul des stats par chantier dans le recap signatures

## Probleme

La fonction `calculateAffectedStats` filtre les `ficheJours` uniquement par **date**, mais les `ficheJours` fusionnees contiennent des entrees de TOUS les chantiers (marquees par `source_chantier_id`). Quand BOUSHABI travaille mercredi sur VILOGIA, il a aussi potentiellement des entrees pour mercredi venant de la fiche AMBERIEU. Le filtre par date seule additionne tout.

- VILOGIA attendu : 15h / 2 paniers / 2 trajets (Me + Ve)
- VILOGIA affiche : 30h / 4 paniers / 2 trajets (double comptage)

## Correction

### Fichier : `src/pages/SignatureFinisseurs.tsx`

#### Modifier `calculateAffectedStats` (ligne 510-512)

Ajouter un filtre sur `source_chantier_id` en plus du filtre par date :

**Avant :**
```typescript
const relevantJours = finisseur.ficheJours.filter(jour => 
  affectedDaysSet.has(jour.date)
);
```

**Apres :**
```typescript
const relevantJours = finisseur.ficheJours.filter(jour => 
  affectedDaysSet.has(jour.date) && 
  (!chantierId || jour.source_chantier_id === chantierId)
);
```

Ce filtre utilise le champ `source_chantier_id` deja present dans les `ficheJours` (ajoute par le hook `useFinisseursByConducteur` lors de la fusion multi-fiche). Cela garantit que seules les heures de la fiche du bon chantier sont comptabilisees.

#### Meme correction pour les absences (ligne ~704)

Appliquer le meme double filtre (date + source_chantier_id) au calcul `countAbsences` dans la boucle de rendu.

## Resultat attendu

- VILOGIA : 15h / 2 paniers (Me + Ve uniquement depuis la fiche VILOGIA)
- AMBERIEU : heures correspondant aux 3 jours (L/M/J) depuis la fiche AMBERIEU
- Aucun double comptage entre chantiers

