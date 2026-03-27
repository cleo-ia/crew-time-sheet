

## Fix: L'onglet Transport ne prend pas en compte le filtre semaine

### Probleme
Le format des semaines dans l'app est `YYYY-S12` (avec un **S**), mais le code du transport split sur `-W`. Du coup le parsing échoue et aucune donnée n'est retournée.

### Correction — `src/components/rh/RHTransportTab.tsx` (lignes 40-47)

Remplacer le parsing manuel de la semaine par l'utilitaire existant `parseISOWeek` de `src/lib/weekUtils.ts` qui gère les deux formats (`-S` et `-W`).

```typescript
// Avant (bug)
const [yearStr, weekStr] = semaine.split("-W");
const jan4 = new Date(Number(yearStr), 0, 4);
const monday = startOfWeek(jan4, { weekStartsOn: 1 });
const weekMonday = addDays(monday, (Number(weekStr) - 1) * 7);

// Après (fix)
import { parseISOWeek } from "@/lib/weekUtils";
const weekMonday = parseISOWeek(semaine); // gère -S et -W
```

Le reste du code (`dateDebut`/`dateFin` calculés à partir de `weekMonday`) reste identique.

