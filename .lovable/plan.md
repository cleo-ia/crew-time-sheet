

## Plan : Tri par date et filtre par mois pour les congés conducteur

### Fichier : `src/components/conges/CongesListSheet.tsx`

#### 1. Tri par date de début

- Ligne 135 : changer `.order("created_at", { ascending: false })` en `.order("date_debut", { ascending: true })` pour `mesDemandes`
- Le hook `useDemandesConges` (ligne 121) trie déjà par `created_at desc` — modifier dans `src/hooks/useDemandesConges.ts` ligne 48 : `.order("date_debut", { ascending: true })`

#### 2. Filtre par mois

- Ajouter un state `selectedMonth` (défaut `"all"`)
- Calculer `availableMonths` via `useMemo` à partir des `date_debut` de toutes les demandes (`demandesAValider` + `mesDemandes`), triés chronologiquement
- Ajouter un `Select` avec icône `CalendarDays` entre le bouton "Nouvelle demande" et les tabs (visible si `availableMonths.length > 0`)
- Filtrer `demandesEnAttente`, `demandesTraitees` et `mesDemandes` selon le mois sélectionné avant le rendu
- Les compteurs (badge "À valider") reflètent les données filtrées

Imports à ajouter : `CalendarDays` (déjà disponible via lucide), `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`, `format` et `fr` (déjà importés).

3 fichiers modifiés (`CongesListSheet.tsx`, `useDemandesConges.ts`), environ 35 lignes ajoutées.

