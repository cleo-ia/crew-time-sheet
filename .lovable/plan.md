

## Plan : Carte "Fiches validées" interactive

### 1. Enrichir le hook `useExportPaieReadiness`

Ajouter un nouveau champ `fichesNonValidees` au type `ExportPaieReadiness` :

```typescript
fichesNonValidees: Array<{
  salarieId: string;
  nom: string;
  prenom: string;
  semaines: string[]; // ex: ["2026-S10", "2026-S11"]
}>
```

Dans la query existante, la requête fetch déjà toutes les fiches avec `salarie_id`. On va :
- Enrichir le `.select()` pour joindre les noms via la relation `utilisateurs` : `.select("id, semaine, statut, salarie_id, chantier_id, utilisateurs!salarie_id(nom, prenom)")`
- Regrouper les fiches non validées par `salarie_id`, collecter les semaines concernées
- Retourner la liste triée par nom

### 2. Créer un composant `FichesNonValideesPopover`

Nouveau fichier `src/components/rh/FichesNonValideesPopover.tsx` :
- Utilise `Dialog` (plus adapté qu'un Popover pour une liste potentiellement longue)
- Titre : "Fiches en attente — {mois}"
- Contenu : `Table` avec colonnes Salarié et Semaines manquantes
- Chaque ligne affiche "Dupont Jean" et les semaines sous forme de badges (ex: `S10`, `S11`)
- Si liste vide : message "Toutes les fiches sont validées"

### 3. Modifier la carte KPI dans `ExportPaie.tsx`

- Ajouter un state `showFichesDetail` pour ouvrir/fermer le dialog
- Entourer la carte "Fiches validées" (lignes 297-306) d'un `onClick` + styles hover (`cursor-pointer`, `hover:bg-accent`, `transition-colors`)
- Ajouter une petite icône `Info` ou `ExternalLink` en coin pour signaler que c'est cliquable
- Rendre le composant `FichesNonValideesPopover` avec les données de `readiness.data.fichesNonValidees`

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/hooks/useExportPaieReadiness.ts` | Ajouter jointure utilisateurs + champ `fichesNonValidees` |
| `src/components/rh/FichesNonValideesPopover.tsx` | Nouveau composant Dialog avec table |
| `src/pages/ExportPaie.tsx` | Carte cliquable + import du nouveau composant |

