

## Plan : Visibilite globale des demandes de conges pour tous les conducteurs

### Probleme actuel
Dans `CongesListSheet.tsx`, l'onglet "Traitees" (ligne 163-166) filtre les demandes pour n'afficher que celles traitees par le conducteur connecte :
```typescript
const demandesTraitees = demandesAValider.filter((d) => 
  (d.validee_par_conducteur_id === conducteurId || d.refusee_par_id === conducteurId) &&
  !allManagedIds.includes(d.demandeur_id)
);
```
Resultat : chaque conducteur ne voit que les demandes qu'il a lui-meme validees ou refusees.

### Correction

**Fichier** : `src/components/conges/CongesListSheet.tsx`

**Ligne 163-166** : Remplacer le filtre "Traitees" pour afficher toutes les demandes traitees de l'entreprise (pas seulement celles du conducteur connecte) :

```typescript
const demandesTraitees = demandesAValider.filter((d) => 
  d.statut === "VALIDEE_CONDUCTEUR" || d.statut === "VALIDEE_RH" || d.statut === "REFUSEE"
);
```

Pas besoin de toucher au hook `useDemandesConges` : il recupere deja toutes les demandes de l'entreprise (filtre RLS par `entreprise_id`). L'onglet "A valider" fonctionne deja correctement (toutes les EN_ATTENTE). Seul le filtre client-side de l'onglet "Traitees" est trop restrictif.

### Impact
- Tous les conducteurs voient toutes les demandes traitees de l'entreprise
- L'onglet "A valider" reste inchange (deja global)
- L'onglet "Mes demandes" reste inchange (demandes creees par ce conducteur pour son equipe)
- 1 seul fichier, 3 lignes modifiees

