

## Filtrer l'onglet Transport RH aux fiches transmises (ENVOYE_RH, AUTO_VALIDE)

### Probleme
Le code actuel charge tous les `fiches_transport_jours` sans vérifier le statut de la fiche parente (`fiches.statut`). Les brouillons et fiches non transmises apparaissent donc dans la vue RH.

### Correction — `src/components/rh/RHTransportTab.tsx`

Apres avoir fetché les `fiches_transport` (ligne 79-83), ajouter `fiche_id` au select, puis :

1. Extraire les `fiche_id` uniques des `fiches_transport`
2. Faire un batch select sur `fiches` avec `.select("id, statut").in("id", ficheIds)`
3. Ne garder que les `fiche_id` dont `statut` est `ENVOYE_RH` ou `AUTO_VALIDE`
4. Filtrer les `fiches_transport` pour ne garder que celles liées a une fiche transmise
5. Filtrer les `joursData` pour ne conserver que ceux dont le `fiche_transport_id` fait partie des transports validés

### Detail technique

```typescript
// Etape 1: ajouter fiche_id au select fiches_transport
.select("id, chantier_id, fiche_id")

// Etape 2: apres transportRes, fetch les fiches parentes
const ficheIds = [...new Set(transportRes.data.map(t => t.fiche_id).filter(Boolean))];
const { data: fichesData } = await supabase
  .from("fiches")
  .select("id, statut")
  .in("id", ficheIds);

// Etape 3: ne garder que les fiches transmises
const validFicheIds = new Set(
  (fichesData || [])
    .filter(f => f.statut === "ENVOYE_RH" || f.statut === "AUTO_VALIDE")
    .map(f => f.id)
);

// Etape 4: filtrer les transports valides
const validTransportIds = new Set(
  transportRes.data
    .filter(t => t.fiche_id && validFicheIds.has(t.fiche_id))
    .map(t => t.id)
);

// Etape 5: filtrer joursData
const filteredJours = joursData.filter(j => validTransportIds.has(j.fiche_transport_id));
```

Le reste du code (groupement, récap conducteurs, badges) utilise `filteredJours` au lieu de `joursData`.

