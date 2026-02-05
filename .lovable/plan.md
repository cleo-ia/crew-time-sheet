
# Plan : Ajouter le bouton "Synchroniser maintenant" dans la vue Planning

## Contexte

Actuellement, le bouton de synchronisation manuelle n'est disponible que dans l'admin panel (onglet Rappels). Le conducteur doit donc naviguer vers l'admin pour déclencher une sync après avoir modifié et re-validé un planning.

**Objectif** : Permettre au conducteur de synchroniser directement depuis `/planning-main-oeuvre` après validation.

---

## Changement prévu

### Fichier : `src/pages/PlanningMainOeuvre.tsx`

**1. Importer le hook de sync**
```typescript
import { useSyncPlanningToTeams } from "@/hooks/useSyncPlanningToTeams";
import { RefreshCw } from "lucide-react"; // Icône de sync
```

**2. Utiliser le hook dans le composant**
```typescript
const { syncPlanningToTeams, isSyncing } = useSyncPlanningToTeams();
```

**3. Ajouter le bouton dans le bandeau vert (planning validé)**

Le bouton "Synchroniser maintenant" apparaîtra **uniquement quand le planning est validé**, à côté du bouton "Modifier" :

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ✓ Planning validé — Synchronisation prévue lundi 5h00                   │
│                                        [Synchroniser maintenant] [Modifier] │
└─────────────────────────────────────────────────────────────────────────┘
```

**Code du bouton :**
```tsx
<Button
  variant="outline"
  onClick={() => syncPlanningToTeams(semaine)}
  disabled={isSyncing}
  className="border-green-400 hover:bg-green-100"
>
  {isSyncing ? (
    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  ) : (
    <RefreshCw className="h-4 w-4 mr-2" />
  )}
  Synchroniser maintenant
</Button>
```

---

## Comportement

| État du planning | Bouton visible | Action |
|------------------|----------------|--------|
| Non validé       | ❌ Non         | Doit d'abord valider |
| Validé           | ✅ Oui         | Déclenche la sync immédiate |

**Après le clic :**
- Toast de succès avec les stats (copiés, créés, supprimés, protégés)
- Les queries des équipes sont invalidées pour rafraîchir les données

---

## Flux complet pour le conducteur

1. **Modifier** → Annule la validation
2. **Corriger** le planning (ajout/suppression d'employés)
3. **Valider le planning** → Réactive la validation
4. **Synchroniser maintenant** → Pousse les changements vers les équipes

---

## Résumé technique

| Élément | Détail |
|---------|--------|
| Fichier modifié | `src/pages/PlanningMainOeuvre.tsx` |
| Hook utilisé | `useSyncPlanningToTeams` (existant) |
| Nouvelle icône | `RefreshCw` de lucide-react |
| Condition d'affichage | `isValidated === true` |
| Paramètre de sync | `semaine` (semaine affichée) |
