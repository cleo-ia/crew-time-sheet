

## Plan : Ajout d'un filtre par mois dans la gestion des congés RH

### Modification

**Fichier** : `src/components/conges/CongesRHSheet.tsx`

1. Ajouter un state `selectedMonth` (par defaut `"all"`)
2. Calculer dynamiquement la liste des mois disponibles a partir des `date_debut` des demandes (format `"YYYY-MM"`, affichage `"Mars 2026"`)
3. Ajouter un `Select` entre le header et les tabs, avec option "Tous les mois" + les mois detectes
4. Filtrer `aValider`, `enAttenteConducteur` et `traitees` en amont selon le mois selectionne (comparaison du `date_debut` avec le mois choisi)
5. Mettre a jour les badges de comptage pour refleter le filtre actif

### Detail technique

- Extraction des mois uniques : `new Set(demandes.map(d => d.date_debut.substring(0, 7)))`, tri chronologique
- Formatage francais avec `date-fns` : `format(new Date(monthKey + "-01"), "MMMM yyyy", { locale: fr })`
- Filtre applique avant la repartition par statut : `demandes.filter(d => selectedMonth === "all" || d.date_debut.startsWith(selectedMonth))`
- Import `Select` depuis `@/components/ui/select` et `CalendarDays` depuis `lucide-react`

1 fichier modifie, environ 30 lignes ajoutees.

