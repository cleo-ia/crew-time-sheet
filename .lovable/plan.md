

## Plan : Toujours afficher le sélecteur de mois

Le filtre est conditionné par `availableMonths.length > 1`, ce qui le masque quand il n'y a qu'un seul mois de données. Il faut l'afficher dès qu'il y a au moins 1 mois disponible.

### Modifications

**Fichier** : `src/components/conges/AbsencesLongueDureeSheet.tsx`
- Ligne 190 : changer `availableMonths.length > 1` en `availableMonths.length > 0`

**Fichier** : `src/components/conges/CongesRHSheet.tsx`
- Appliquer le même changement pour la cohérence (le filtre par mois des congés RH a la même condition)

2 fichiers, 1 ligne modifiée chacun.

