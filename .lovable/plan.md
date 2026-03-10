

## Refonte de l'onglet "Période" — `/export-paie`

### Objectif
Transformer le Step 1 (simple sélecteur de mois) en un dashboard de pré-validation avec 4 améliorations.

### Ce qui change

**1. Résumé contextuel**
Sous le sélecteur de mois, afficher une grille de 3-4 KPI cards :
- Nombre de salariés concernés
- Nombre de fiches validées / total
- Nombre de chantiers actifs sur le mois
- Statut de la période (Ouverte / Clôturée)

On crée un hook `useExportPaieReadiness(periode)` qui query :
- `fiches` pour le mois (semaines chevauchant le mois) → comptage par statut
- `periodes_cloturees` pour savoir si le mois est déjà clôturé
- Calcul des semaines ISO couvrant le mois, identification de la dernière semaine

**2. Indicateur de readiness (corrigé)**
Un badge visuel prominent :
- **Vert** : Toutes les semaines sauf la dernière sont validées → **"Prêt pour l'export"** avec sous-texte "Dernière semaine estimée par la paie prévisionnelle — comportement normal"
- **Vert complet** : Toutes les semaines y compris la dernière sont validées → **"Prêt pour l'export — mois complet"**
- **Orange** : Il manque des semaines autres que la dernière → **"Données incomplètes"** avec détail des semaines manquantes
- **Rouge** : Période déjà clôturée → **"Période clôturée le [date]"**

La logique : on calcule les semaines ISO dont le lundi tombe dans le mois. Pour chaque semaine, on vérifie si des fiches existent avec un statut final (`VALIDE_CHEF`, `VALIDE_CONDUCTEUR`, `ENVOYE_RH`). La dernière semaine du mois est traitée séparément.

**3. Navigation mois précédent / suivant**
Boutons `<` et `>` de chaque côté du `Select`, même pattern que `WeekSelector`.

**4. Dernière clôture**
Texte discret sous la card : "Dernière clôture : [mois] le [date]" récupéré depuis `periodes_cloturees` ORDER BY `date_cloture` DESC LIMIT 1.

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/hooks/useExportPaieReadiness.ts` | **Nouveau** — hook React Query pour readiness + stats + dernière clôture |
| `src/pages/ExportPaie.tsx` | Modifier Step 1 : intégrer le nouveau hook, afficher KPIs, readiness badge, nav mois, dernière clôture |

### Détail technique du hook `useExportPaieReadiness`

```typescript
// Retourne :
interface ExportPaieReadiness {
  status: 'ready' | 'ready_complete' | 'incomplete' | 'closed';
  label: string;
  sublabel: string;
  // Stats
  nbSalaries: number;
  nbFichesValidees: number;
  nbFichesTotal: number;
  nbChantiers: number;
  // Semaines
  semainesManquantes: string[];
  derniereSemaineMois: string;
  // Clôture
  dateDerniereCloture: string | null;
  moisDerniereCloture: string | null;
}
```

### UI Step 1 — Structure

```text
┌─────────────────────────────────────────────┐
│  Sélection de la période                    │
│  [description]                              │
│                                             │
│  [<]  [ ▼ Mars 2026 ]  [>]                 │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ ● Prêt pour l'export               │    │
│  │   Dernière semaine estimée —        │    │
│  │   comportement normal               │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │12 sal│ │47/52 │ │8 chan│ │Ouvert│      │
│  │      │ │fiches│ │tiers │ │      │      │
│  └──────┘ └──────┘ └──────┘ └──────┘      │
│                                             │
│  Dernière clôture : février 2026 (05/03)    │
└─────────────────────────────────────────────┘
```

