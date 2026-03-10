

## Plan : Brancher les logs d'activité Conducteurs

### Constat

- **`validation_conducteur`** existe deja dans `FicheDetail.tsx` (L283-297) et `ACTION_CONFIG` (L32). Rien a faire.
- **`sync_planning`** existe deja dans `ACTION_CONFIG` (L35) mais aucun log n'est emis. A brancher.

### 4 fichiers a modifier

**1. `src/components/admin/ChantiersManager.tsx`** — Action `gestion_chantier`

Dans `handleSave` (L63-103), apres le `createChantier.mutateAsync` ou `updateChantier.mutateAsync` reussi :
- Importer `useLogModification`, `useCurrentUserInfo`
- Logger avec `action: "gestion_chantier"`, message : `"Ouverture du chantier [Nom]"` (creation) ou `"Modification du chantier [Nom]"` (edition)
- Pour l'archivage via toggle `actif`, detecter le changement et logger `"Archivage du chantier [Nom]"`

**2. `src/pages/PlanningMainOeuvre.tsx`** — Actions `sync_planning` + `affectation_planning`

- Importer `useLogModification`, `useCurrentUserInfo`
- **Sync** : Dans le `onClick` du bouton "Synchroniser maintenant" (L501), wrapper pour logger apres succes : `"Synchronisation du planning envoyee aux chefs (Semaine [X])"`
- **Affectation** : Dans `handleAddEmploye` (L250-331), apres les upserts reussis, logger `"Affectation : [Nom Salarie] affecte au chantier [Nom] ([Nb] jours)"`. Recuperer le nom du salarie via une requete Supabase rapide ou depuis les donnees deja chargees (`affectations` contient `employe`).

**3. `src/components/conges/CongesListSheet.tsx`** — Action `decision_conge`

- Importer `useLogModification`, `useCurrentUserInfo`
- Dans `handleValidate` (L202-208), apres `validateMutation.mutate`, utiliser le callback `onSuccess` pour logger : `"Acceptation de la demande de conge pour [Nom] du [Date] au [Date]"`
- Dans `handleConfirmRefuse` (L216-228), apres `refuseMutation.mutate`, logger : `"Refus de la demande de conge pour [Nom] du [Date] au [Date]"`
- Recuperer le nom du demandeur depuis `demandesAValider` (deja charge, contient les infos).

**4. `src/components/shared/ModificationHistoryTable.tsx`** — UI

Ajouter dans `ACTION_CONFIG` :
```
gestion_chantier: { label: "Chantier", variant: "default" }
affectation_planning: { label: "Affectation", variant: "secondary" }
decision_conge: { label: "Decision conge", variant: "outline" }
```
(`sync_planning` et `validation_conducteur` existent deja)

---

### Resume

| Fichier | Action | Deja fait ? |
|---------|--------|-------------|
| ChantiersManager.tsx | `gestion_chantier` | Non |
| PlanningMainOeuvre.tsx | `sync_planning` + `affectation_planning` | Non |
| CongesListSheet.tsx | `decision_conge` | Non |
| FicheDetail.tsx | `validation_conducteur` | Oui - skip |
| ModificationHistoryTable.tsx | 3 entrees ACTION_CONFIG | Non |

