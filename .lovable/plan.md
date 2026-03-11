

## Plan: Correction du filtre finisseurs pour fiches transmises

### Problème
Les fiches transmises (ENVOYE_RH, AUTO_VALIDE, CLOTURE) sont filtrées par les affectations planning, ce qui les fait disparaître si les affectations ont été purgées ou si le finisseur est géré par un chef (table `affectations_jours_chef` ignorée).

### Modifications

#### Fichier 1 : `src/hooks/rhShared.ts` (lignes 604-613)

Ajouter une condition : si la fiche est transmise, ne pas filtrer par affectation.

```typescript
if (isFinisseur) {
  const datesAffectees = affectationsMap.get(salarieId);
  if (datesAffectees && datesAffectees.size > 0) {
    // Ne filtrer que les fiches non-transmises
    const ficheTransmise = ["ENVOYE_RH", "AUTO_VALIDE", "CLOTURE"].includes(ficheStatut);
    if (!ficheTransmise && !datesAffectees.has(jour.date)) {
      continue;
    }
  }
}
```

#### Fichier 2 : `src/hooks/useRHData.ts` (lignes 711-732)

Deux corrections :
1. Requêter aussi `affectations_jours_chef` et fusionner les dates
2. Ne filtrer que les jours des fiches non-transmises

```typescript
if (isFinisseur && fichesJours.length > 0) {
  // 1. Récupérer affectations finisseurs
  let affQuery1 = supabase
    .from("affectations_finisseurs_jours")
    .select("date")
    .eq("finisseur_id", salarieId);
  if (filters.semaine && filters.semaine !== "all") {
    affQuery1 = affQuery1.eq("semaine", filters.semaine);
  }
  const { data: aff1 } = await affQuery1;

  // 2. Récupérer affectations chef (macon_id = finisseur géré par un chef)
  let affQuery2 = supabase
    .from("affectations_jours_chef")
    .select("jour")
    .eq("macon_id", salarieId);
  if (filters.semaine && filters.semaine !== "all") {
    affQuery2 = affQuery2.eq("semaine", filters.semaine);
  }
  const { data: aff2 } = await affQuery2;

  // 3. Fusionner les dates
  const datesAffectees = new Set([
    ...(aff1?.map(a => a.date) || []),
    ...(aff2?.map(a => a.jour) || []),
  ]);

  // 4. Construire Set des fiche_id transmis
  const fichesTransmises = new Set(
    filteredFiches
      .filter(f => ["ENVOYE_RH", "AUTO_VALIDE", "CLOTURE"].includes(f.statut))
      .map(f => f.id)
  );

  // 5. Filtrer seulement les jours des fiches NON transmises
  if (datesAffectees.size > 0) {
    fichesJours = fichesJours.filter(jour =>
      fichesTransmises.has(jour.fiche_id) || datesAffectees.has(jour.date)
    );
  }
}
```

### Impact
- Corrige l'affichage de Said GAMINE et tout finisseur géré par un chef
- Les fiches transmises ne sont plus jamais filtrées par le planning
- Aucune régression : les fiches en cours restent filtrées normalement
- 2 fichiers modifiés, aucun nouveau fichier

