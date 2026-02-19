
# Adapter la fiche de trajet aux jours d'affectation par chantier

## Probleme

Le composant `TransportSheetV2` genere toujours 5 jours (Lundi a Vendredi), meme quand le finisseur n'est affecte que certains jours sur ce chantier. Sous VILOGIA par exemple, on demande de remplir 5 jours de trajet alors que l'equipe n'y travaille que 2 jours (Me/V).

## Solution

Passer les dates d'affectation effectives au composant `TransportSheetV2` via une nouvelle prop `assignedDates`, et ne generer/afficher que ces jours-la.

### 1. Fichier : `src/pages/ValidationConducteur.tsx`

Calculer les dates d'affectation pour chaque chantier et les passer au wrapper `TransportSheetWithFiche` :

- Ajouter une prop `assignedDates` au wrapper `TransportSheetWithFicheInner` (tableau de strings `yyyy-MM-dd`)
- La transmettre a `TransportSheetV2`
- Au point d'appel (ligne 877), calculer les dates a partir des `affectationsJours` filtrees par `chantierId`

```text
// Calcul des dates assignees pour ce chantier
const chantierAssignedDates = [...new Set(
  (affectationsJours || [])
    .filter(a => chantierId !== "sans-chantier" && a.chantier_id === chantierId)
    .map(a => a.date)
)];

<TransportSheetWithFiche
  ...
  assignedDates={chantierAssignedDates}
/>
```

### 2. Fichier : `src/components/transport/TransportSheetV2.tsx`

- Ajouter la prop `assignedDates?: string[]` a l'interface `TransportSheetV2Props`
- Modifier la boucle d'initialisation des jours (ligne 192-213) : si `assignedDates` est fourni et non vide, ne generer que ces dates au lieu des 5 jours fixes
- Adapter le calcul `isComplete` (ligne 430-438) pour ne verifier que les jours assignes
- Adapter les compteurs `totalVehicules`/`completedVehicules` de la meme facon

```text
// Initialisation : generer seulement les jours assignes si fournis
const datesToGenerate: string[] = assignedDates && assignedDates.length > 0
  ? assignedDates
  : Array.from({ length: 5 }, (_, i) => format(addDays(selectedWeek, i), "yyyy-MM-dd"));

const allDays: TransportDayV2[] = datesToGenerate.map(dateString => {
  const existingDay = existingTransport?.days.find(d => d.date === dateString);
  return {
    date: dateString,
    vehicules: existingDay ? existingDay.vehicules : [{ ... vehicule vide }],
  };
});
```

### 3. Fichier : `src/hooks/useTransportValidation.ts`

Ajouter un parametre `assignedDates` pour ajuster le nombre de jours attendus :

- Si `assignedDates` est fourni, `expectedDays = assignedDates.length - absents`
- Filtrer les jours verifies par `assignedDates`

### Impact

- VILOGIA : la fiche de trajet n'affichera que Me/V (2 jours au lieu de 5)
- AMBERIEU : la fiche de trajet n'affichera que L/M/J (3 jours au lieu de 5)
- La validation de completude tiendra compte du nombre reel de jours
- Aucun changement en base de donnees
- Le mode "chef" (sans `assignedDates`) continue a generer les 5 jours comme avant
