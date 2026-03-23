

## Plan : Ajouter les filtres manquants dans useDeletePlanningAffectation

### Probleme

La suppression d'une affectation planning filtre uniquement par `employe_id` + `jour` + `entreprise_id`. Il manque `chantier_id` et `semaine`, ce qui pourrait supprimer des lignes non visees.

### Modifications

**Fichier 1 : `src/hooks/usePlanningAffectations.ts`** (lignes 134-145)

Ajouter `chantier_id` aux params et aux filtres de la requete delete :

```typescript
mutationFn: async (params: { 
  employe_id: string; 
  chantier_id: string;  // AJOUT
  jour: string; 
  semaine: string;
  entreprise_id: string;
}) => {
  const { error } = await supabase
    .from("planning_affectations")
    .delete()
    .eq("employe_id", params.employe_id)
    .eq("chantier_id", params.chantier_id)  // AJOUT
    .eq("jour", params.jour)
    .eq("semaine", params.semaine)           // AJOUT
    .eq("entreprise_id", params.entreprise_id);

  if (error) throw error;
},
```

**Fichier 2 : `src/pages/PlanningMainOeuvre.tsx`** (ligne 271-276)

Passer `chantier_id` lors de l'appel :

```typescript
await deleteAffectation.mutateAsync({
  employe_id: employeId,
  chantier_id: chantierId,  // AJOUT
  jour: date,
  semaine,
  entreprise_id: entrepriseId,
});
```

### Analyse zero regression

| Point | Verification |
|-------|-------------|
| Seul appelant | `PlanningMainOeuvre.tsx` — un seul endroit appelle `deleteAffectation.mutate` |
| `chantierId` disponible | Oui, c'est un parametre de `handleDayToggle(employeId, chantierId, date, checked)` |
| Comportement identique en usage normal | Oui — un employe ne peut etre que sur un chantier par jour, donc le filtre supplementaire ne change rien au cas nominal |
| Protection supplementaire | Si un bug UI permettait un double-affectation, seule la bonne ligne serait supprimee |
| Cache invalidation | Inchange — invalide toujours par `semaine` |

Modification purement defensive, aucun changement de comportement observable.

