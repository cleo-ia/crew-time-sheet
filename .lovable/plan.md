

## Plan : Brancher les logs d'activité des Chefs

### Analyse

Quatre points de branchement identifiés. Le `useLogModification` et `useCurrentUserInfo` seront importés dans chaque fichier concerné.

**Contrainte importante** : `TimeEntryTable` et `TransportSheetV2` utilisent l'auto-save (debounce). Le log ne doit pas se déclencher à chaque frappe mais **une seule fois par cycle de sauvegarde réussi**.

---

### Fichiers modifiés

**1. `src/hooks/useAutoSaveFiche.ts`** — Action `saisie_chef`

Le meilleur endroit pour logger la saisie est dans le `onSuccess` de la mutation auto-save (pas dans `TimeEntryTable` qui se re-render en continu). On logera un résumé par salarié sauvegardé.

- Importer `useLogModification`, `useCurrentUserInfo`.
- Dans `onSuccess`, appeler `logModification.mutate` pour chaque salarié sauvegardé avec :
  - `action: "saisie_chef"`
  - `details.message: "Saisie d'activité pour [Nom] : [X]h, [Panier/Resto/—]"`
  - `details.salarie`, `details.semaine`, `details.chantier`

**Problème** : `useAutoSaveFiche` est un hook mutation pur, il n'a pas accès au contexte user. **Alternative** : passer `userId`/`userName`/`entrepriseId` dans les params de la mutation (déjà `chefId` est passé). On ajoutera `entrepriseId` aux params et on fera le log dans le `mutationFn` après le succès des inserts, en récupérant le nom du chef depuis les données déjà disponibles.

**Simplification retenue** : Logger dans `Index.tsx` dans le `handleSaveAndSign` (point 2 ci-dessous couvre le verrouillage). Pour la saisie courante (auto-save), on logera dans le callback `onSuccess` du `useAutoSaveFiche` en passant les infos nécessaires via les params.

**2. `src/pages/Index.tsx`** — Action `verrouillage_fiche`

- Importer `useLogModification`, `useCurrentUserInfo`.
- Dans `handleSaveAndSign`, après le `autoSaveFiche.mutateAsync` réussi (L402-407), appeler `logModification.mutate` avec :
  - `action: "verrouillage_fiche"`
  - `details.message: "Fiche envoyée pour signature (Données verrouillées) - Semaine [X]"`
  - `details.semaine`, `details.chantier`

**3. `src/hooks/useAutoSaveTransportV2.ts`** — Action `saisie_transport`

- Logger dans le `onSuccess` de la mutation après sauvegarde réussie.
- Passer `entrepriseId`, `userId`, `userName` dans les params de sauvegarde.
- `action: "saisie_transport"`
- `details.message: "Fiche trajet remplie : Véhicule [Immat], Chauffeur: [Nom]"`
- Log un seul enregistrement par cycle de save (résumé des véhicules du jour).

**Alternative plus simple** : Logger dans `TransportSheetV2.tsx` au moment du `handleSave` manuel (L358-380) et du `duplicateMondayToWeek`. L'auto-save transport se déclenche trop souvent pour logger à chaque fois. On logera uniquement sur les actions explicites.

**4. `src/components/conges/CongesSheet.tsx`** — Action `demande_absence`

- Importer `useLogModification`, `useCurrentUserInfo`.
- Dans `handleSubmit` (L121-138), après le `createDemande.mutateAsync` réussi, appeler `logModification.mutate` avec :
  - `action: "demande_absence"`
  - `details.message: "Demande d'absence déposée pour [Nom] du [Date Début] au [Date Fin] ([Type])"`

**5. `src/components/shared/ModificationHistoryTable.tsx`** — UI

Ajouter dans `ACTION_CONFIG` :
```
saisie_chef: { label: "Saisie chef", variant: "default" }
verrouillage_fiche: { label: "Verrouillage", variant: "outline" }
saisie_transport: { label: "Transport", variant: "secondary" }
demande_absence: { label: "Demande absence", variant: "destructive" }
```

---

### Résumé des 5 fichiers touchés

| Fichier | Action loguée |
|---------|--------------|
| `Index.tsx` | `verrouillage_fiche` |
| `TransportSheetV2.tsx` | `saisie_transport` (save manuel + duplication) |
| `CongesSheet.tsx` | `demande_absence` |
| `useAutoSaveFiche.ts` | `saisie_chef` (dans onSuccess) |
| `ModificationHistoryTable.tsx` | 4 nouvelles entrées ACTION_CONFIG |

