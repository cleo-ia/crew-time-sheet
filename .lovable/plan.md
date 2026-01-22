

# Correction CORS - sync-planning-to-teams

## Diagnostic

L'erreur console est explicite :
```
Request header field x-entreprise-id is not allowed by 
Access-Control-Allow-Headers in preflight response
```

L'Edge Function `sync-planning-to-teams` n'autorise pas le header `x-entreprise-id` dans sa configuration CORS.

## Cause racine

Dans `supabase/functions/sync-planning-to-teams/index.ts` (ligne 4-7) :
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  // ❌ MANQUE: x-entreprise-id
}
```

Le client Supabase (voir `src/integrations/supabase/client.ts`) envoie automatiquement le header `x-entreprise-id` avec chaque requête pour l'isolation multi-tenant, mais l'Edge Function ne l'accepte pas.

## Solution

Ajouter `x-entreprise-id` à la liste des headers CORS autorisés.

## Modification à effectuer

**Fichier** : `supabase/functions/sync-planning-to-teams/index.ts`

**Lignes 4-7** - Modifier `corsHeaders` :

```typescript
// Avant
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Après
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-entreprise-id',
}
```

## Impact

- **1 fichier modifié** : `sync-planning-to-teams/index.ts`
- **1 ligne modifiée** : ajout de `, x-entreprise-id` dans les headers autorisés
- **Correction immédiate** de l'erreur CORS
- **Déploiement automatique** de l'Edge Function

## Vérification post-correction

Une fois corrigé, vous pourrez :
1. Cliquer sur "Synchroniser 2026-S05"
2. Vérifier que les affectations sont créées correctement pour les 4 employés :
   - DARCOURT → TEST (L-V)
   - KASMI → TEST (L-M) + LE ROSEYRAN (Me-V)
   - DUBOIS → LE ROSEYRAN (L-V)
   - MARTEL + MANUNTA → LES ARCS (L-V)

