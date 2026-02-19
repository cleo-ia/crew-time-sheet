

# Accès a la semaine S15 pour les tests

## Contexte
Les selecteurs de semaine cote "Saisie Chef" et "Validation Conducteur" sont limites a 3 semaines (S-1, S, S+1). Pour tester sur une semaine eloignee (2026-S15), il faut les etendre.

## Impact sur les semaines vivantes
La synchronisation manuelle du planning est **strictement ciblee par semaine**. Lancer une sync sur S15 ne touchera ni S09, ni S10, ni aucune autre semaine. Le parametre `semaine` dans le body de la requete isole completement l'operation.

## Modifications prevues

### 1. WeekSelectorChef (src/components/timesheet/WeekSelectorChef.tsx)
Ajouter une navigation libre par fleches (comme le PlanningWeekSelector) en complement du dropdown existant. L'approche la plus simple : ajouter deux boutons fleches a gauche et droite du Select pour permettre de naviguer semaine par semaine au-dela des 3 semaines par defaut.

Quand l'utilisateur navigue avec les fleches vers une semaine hors du dropdown (ex: S15), la semaine est quand meme selectionnee et affichee correctement.

### 2. WeekSelector conducteur (src/components/timesheet/WeekSelector.tsx)
Meme modification : ajouter des boutons fleches pour naviguer librement.

## Details techniques

Pour les deux composants :
- Importer `ChevronLeft`, `ChevronRight` de lucide-react et `Button` de ui/button
- Importer `calculatePreviousWeek`, `getNextWeek` de `@/lib/weekUtils`
- Wrapper le `Select` existant avec des boutons fleches
- Quand la valeur courante n'est pas dans la liste du dropdown, l'ajouter dynamiquement pour que le Select affiche correctement le label
- Le dropdown garde les 3 semaines standard (S-1, S, S+1) pour un acces rapide

### Structure UI resultante
```text
[ < ] [ Semaine 09 - du 23/02/2026  v ] [ > ]
```

## Ce qui ne change PAS
- La logique S-2 conditionnelle du chef reste intacte
- Le planning a deja des fleches, rien a modifier
- Aucune modification backend ou BDD
- Les fleches sont juste un raccourci qui appelle `onChange()` avec la semaine precedente/suivante

