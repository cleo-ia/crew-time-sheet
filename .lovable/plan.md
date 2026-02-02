

# Plan : Ajouter le paramètre entreprise_id obligatoire à purge-week

## Objectif

Modifier la fonction Edge `purge-week` pour qu'elle accepte un paramètre `entreprise_id` **obligatoire**, garantissant que chaque purge n'affecte qu'une seule entreprise.

## Modifications à apporter

### Fichier : `supabase/functions/purge-week/index.ts`

| Section | Modification |
|---------|--------------|
| Parsing body (ligne 24) | Ajouter `entreprise_id` aux paramètres extraits |
| Validation (après ligne 32) | Ajouter validation obligatoire de `entreprise_id` |
| Logs (ligne 44) | Inclure le nom de l'entreprise dans les logs |
| Toutes les requêtes DELETE | Ajouter `.eq('entreprise_id', entreprise_id)` comme filtre |
| Réponse (ligne 310-316) | Inclure `entreprise_id` dans la réponse |

## Détails techniques

### 1. Extraction et validation du paramètre

```typescript
// Ligne 24 : Ajouter entreprise_id
const { semaine, chantier_id, entreprise_id } = await req.json();

// Après ligne 32 : Validation obligatoire
if (!entreprise_id || typeof entreprise_id !== 'string') {
  return new Response(
    JSON.stringify({ error: 'Missing or invalid "entreprise_id" parameter - required for safety' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### 2. Récupération du nom de l'entreprise (optionnel, pour les logs)

```typescript
// Après validation, récupérer le nom pour les logs
const { data: entreprise } = await supabase
  .from('entreprises')
  .select('nom, slug')
  .eq('id', entreprise_id)
  .single();

const entrepriseLabel = entreprise?.slug || entreprise?.nom || entreprise_id;
console.log(`🚀 Starting purge for week: ${semaine}, entreprise: ${entrepriseLabel}${filterByChantier ? `, chantier: ${chantier_id}` : ''}`);
```

### 3. Ajout du filtre entreprise_id à chaque table

Les tables avec `entreprise_id` à filtrer :

| Table | A la colonne entreprise_id ? |
|-------|------------------------------|
| `affectations_finisseurs_jours` | ✅ Oui |
| `affectations` | ✅ Oui |
| `fiches` | ✅ Oui |
| `signatures` | ✅ Oui (via fiche_id déjà filtré) |
| `fiches_transport_finisseurs` | ✅ Oui |
| `fiches_transport_finisseurs_jours` | ✅ Oui |
| `fiches_transport` | ✅ Oui |
| `fiches_transport_jours` | ✅ Oui |
| `fiches_jours` | ✅ Oui |
| `affectations_jours_chef` | ✅ Oui |
| `planning_affectations` | ✅ Oui |
| `planning_validations` | ✅ Oui |

### 4. Exemples de modifications par étape

**Step 1 - affectations_finisseurs_jours :**
```typescript
let affQuery = supabase
  .from('affectations_finisseurs_jours')
  .delete({ count: 'exact' })
  .eq('semaine', semaine)
  .eq('entreprise_id', entreprise_id);  // ✅ AJOUT
```

**Step 1.5 - affectations :**
```typescript
let affMaconsQuery = supabase
  .from('affectations')
  .delete({ count: 'exact' })
  .gte('date_debut', startDateStr)
  .lte('date_debut', endDateStr)
  .eq('entreprise_id', entreprise_id);  // ✅ AJOUT
```

**Step 2 - fiches (requête SELECT) :**
```typescript
let fichesQuery = supabase
  .from('fiches')
  .select('id')
  .eq('semaine', semaine)
  .eq('entreprise_id', entreprise_id);  // ✅ AJOUT
```

**Step 4 - fiches_transport_finisseurs :**
```typescript
let ftfQuery = supabase
  .from('fiches_transport_finisseurs')
  .select('id')
  .eq('semaine', semaine)
  .eq('entreprise_id', entreprise_id);  // ✅ AJOUT
```

**Step 6 - fiches_transport :**
```typescript
let ftQuery = supabase
  .from('fiches_transport')
  .select('id')
  .eq('semaine', semaine)
  .eq('entreprise_id', entreprise_id);  // ✅ AJOUT
```

**Step 10 - affectations_jours_chef :**
```typescript
let ajcQuery = supabase
  .from('affectations_jours_chef')
  .delete({ count: 'exact' })
  .eq('semaine', semaine)
  .eq('entreprise_id', entreprise_id);  // ✅ AJOUT
```

**Step 11 - planning_affectations :**
```typescript
let paQuery = supabase
  .from('planning_affectations')
  .delete({ count: 'exact' })
  .eq('semaine', semaine)
  .eq('entreprise_id', entreprise_id);  // ✅ AJOUT
```

**Step 12 - planning_validations :**
```typescript
const { error: pvError, count: pvCount } = await supabase
  .from('planning_validations')
  .delete({ count: 'exact' })
  .eq('semaine', semaine)
  .eq('entreprise_id', entreprise_id);  // ✅ AJOUT
```

### 5. Réponse enrichie

```typescript
return new Response(
  JSON.stringify({
    success: true,
    semaine,
    entreprise_id,
    entreprise_nom: entreprise?.nom || null,
    chantier_id: filterByChantier ? chantier_id : null,
    deleted: results,
    total
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

## Résultat attendu

Après cette modification :
- L'appel `{ semaine: "2026-S07" }` retournera une erreur 400 "Missing entreprise_id"
- L'appel `{ semaine: "2026-S07", entreprise_id: "uuid-sder" }` ne purgera **que** les données SDER
- Les logs indiqueront clairement quelle entreprise est concernée
- Aucun risque de purger accidentellement les données d'autres entreprises

