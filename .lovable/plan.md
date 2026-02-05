
# Plan corrigé : Ajouter le Code Chantier côté Conducteur

## Fonctionnement à reproduire (côté Chef)

Le hook `useTransportByChantier` utilise une logique à 2 niveaux :

```text
Source 1 : fiches_jours.code_chantier_du_jour (par date)
     ↓ fallback
Source 2 : chantiers.code_chantier (code par défaut du chantier)
```

## Modifications prévues

### Fichier : `src/pages/SignatureFinisseurs.tsx`

### Étape 1 : Récupérer les codes chantier par date

Après le chargement des jours transport, ajouter une requête pour obtenir les `code_chantier_du_jour` depuis `fiches_jours` :

```typescript
// Récupérer les fiche_id uniques
const ficheTransportIds = [...new Set(joursTransport.map(j => j.fiche_transport_id))];

// Pour chaque fiche_transport, récupérer la fiche parente
const { data: fichesTransport } = await supabase
  .from("fiches_transport")
  .select("id, fiche_id, chantier_id")
  .in("id", ficheTransportIds);

// Récupérer les codes chantier du jour depuis fiches_jours
const ficheIds = [...new Set((fichesTransport || []).map(ft => ft.fiche_id).filter(Boolean))];

const { data: fichesJours } = await supabase
  .from("fiches_jours")
  .select("fiche_id, date, code_chantier_du_jour")
  .in("fiche_id", ficheIds);

// Créer la map date → code_chantier_du_jour
const codeChantierByDate = new Map(
  (fichesJours || []).map(fj => [fj.date, fj.code_chantier_du_jour])
);
```

### Étape 2 : Récupérer les codes chantier par défaut (fallback)

```typescript
// Fallback : codes chantier par défaut
const chantierIds = [...new Set((fichesTransport || []).map(ft => ft.chantier_id).filter(Boolean))];

const { data: chantiers } = await supabase
  .from("chantiers")
  .select("id, code_chantier")
  .in("id", chantierIds);

const defaultCodeByChantier = new Map(
  (chantiers || []).map(c => [c.id, c.code_chantier])
);
```

### Étape 3 : Enrichir les données brutes

Stocker les métadonnées nécessaires avec chaque jour transport :

```typescript
// Enrichir chaque jour avec le code chantier
const enrichedJours = joursTransport.map(jour => {
  const ft = fichesTransport?.find(f => f.id === jour.fiche_transport_id);
  const codeFromFiche = codeChantierByDate.get(jour.date);
  const codeDefault = ft?.chantier_id ? defaultCodeByChantier.get(ft.chantier_id) : null;
  
  return {
    ...jour,
    codeChantier: codeFromFiche || codeDefault || "-"
  };
});
```

### Étape 4 : Mettre à jour la consolidation

```typescript
const consolidatedTransportData = useMemo(() => {
  const groupedByDate = new Map<string, {
    codeChantier: string;
    vehiculesMap: Map<string, VehiculeData>;
  }>();

  allTransportJoursRaw.forEach((jour: any) => {
    if (!jour.immatriculation) return;
    
    if (!groupedByDate.has(jour.date)) {
      groupedByDate.set(jour.date, {
        codeChantier: jour.codeChantier || "-",  // ← Utiliser le code enrichi
        vehiculesMap: new Map()
      });
    }
    
    // ... reste de la logique véhicules inchangée
  });

  // Générer le format pour TransportSummaryV2
  const days = Array.from(groupedByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      codeChantier: data.codeChantier,  // ← Inclure le code
      vehicules: Array.from(data.vehiculesMap.values())
    }));

  return { days };
}, [allTransportJoursRaw]);
```

### Fichier : `src/components/transport/TransportSummaryV2.tsx`

Adapter le parsing du format V2 pour utiliser le `codeChantier` transmis :

```typescript
if (isV2Format) {
  transportData.days.forEach((day: any) => {
    groupedByDate.set(day.date, {
      codeChantier: day.codeChantier || "-",  // ← Lire depuis les données
      vehicules: day.vehicules || []
    });
  });
}
```

---

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/pages/SignatureFinisseurs.tsx` | Ajouter requêtes fiches_jours + chantiers + enrichir consolidation |
| `src/components/transport/TransportSummaryV2.tsx` | Lire `codeChantier` du format V2 |

---

## Résultat attendu

| Date | Code Chantier | Véhicule | Conducteur Matin | Conducteur Soir |
|------|--------------|----------|------------------|-----------------|
| Lun. 02/02 | **SEAUVE** | ET-029-BX | Hadj Mohamed GRIBI | Hadj Mohamed GRIBI |
| Lun. 02/02 | **SEAUVE** | FR-263-PN | Flavio FERNANDES | CENTRALISTE |
| Mar. 03/02 | **SEAUVE** | DL-898-FB | Flavio FERNANDES | Dariusz ROMANOWSKI |

Identique à l'affichage côté Chef avec la même logique de récupération des codes chantier.
