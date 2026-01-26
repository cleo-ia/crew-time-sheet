
# Plan : Correction du blocage CORS pour les Edge Functions

## Problème identifié

L'utilisateur ne peut pas supprimer "TEST 2" car l'Edge Function `delete-user` rejette la requête avec une erreur CORS :

```
Request header field x-entreprise-id is not allowed by Access-Control-Allow-Headers in preflight response
```

### Cause racine

Depuis l'implémentation du système multi-tenant, le client Supabase (`src/integrations/supabase/client.ts`) envoie automatiquement le header `x-entreprise-id` dans **toutes** les requêtes, y compris les appels aux Edge Functions.

Cependant, **19 des 20 Edge Functions** n'ont pas ajouté ce header à leur liste CORS `Access-Control-Allow-Headers`, ce qui cause le rejet des requêtes par le navigateur lors de la phase preflight OPTIONS.

### Edge Functions affectées

Toutes ces fonctions sont actuellement bloquées depuis le frontend :

**Administration & Gestion utilisateurs :**
- `delete-user` ❌ (le problème actuel)
- `invite-user` ❌

**Purge & Nettoyage (appelées depuis AdminPanel) :**
- `purge-affectations-jours-chef` ❌
- `purge-affectations-finisseurs` ❌
- `purge-affectations-macons` ❌
- `purge-fiches-jours-duplicates` ❌
- `purge-demandes-conges` ❌
- `purge-entreprise-complete` ❌
- `purge-all-test-data` ❌
- `purge-transport-week` ❌
- `purge-week` ❌
- `purge-entreprise-weeks` ❌
- `purge-orphan-fiches` ❌

**Autres :**
- `create-test-data-s45` ❌
- `notify-conducteur` ❌

**Rappels automatiques (non affectés car CRON) :**
- `rappel-conducteurs` ⚠️ (pas affecté par CORS mais devrait être cohérent)
- `rappel-conducteurs-finisseurs` ⚠️
- `rappel-chefs` ⚠️
- `rappel-chefs-lundi` ⚠️

**Seule fonction déjà corrigée :**
- `sync-planning-to-teams` ✅ (déjà conforme)

---

## Solution proposée

Ajouter `x-entreprise-id` à la liste des headers CORS autorisés dans toutes les Edge Functions appelables depuis le frontend.

### Modification type

**Avant :**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Après :**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-entreprise-id",
};
```

---

## Liste exhaustive des fichiers à modifier

### 1. Edge Functions critiques (appelées par les utilisateurs)

| Fichier | Ligne | Priorité | Usage |
|---------|-------|----------|-------|
| `supabase/functions/delete-user/index.ts` | 6 | 🔴 URGENT | Suppression utilisateurs (bloqué actuellement) |
| `supabase/functions/invite-user/index.ts` | 6 | 🔴 URGENT | Invitations utilisateurs |
| `supabase/functions/notify-conducteur/index.ts` | 20 | 🟡 HAUTE | Notifications conducteurs |

### 2. Edge Functions de purge (Debug/Admin)

| Fichier | Ligne | Priorité | Usage |
|---------|-------|----------|-------|
| `supabase/functions/purge-affectations-jours-chef/index.ts` | 5 | 🟢 MOYENNE | Nettoyage planning chefs |
| `supabase/functions/purge-affectations-finisseurs/index.ts` | 5 | 🟢 MOYENNE | Nettoyage planning finisseurs |
| `supabase/functions/purge-affectations-macons/index.ts` | 5 | 🟢 MOYENNE | Nettoyage affectations maçons |
| `supabase/functions/purge-fiches-jours-duplicates/index.ts` | 5 | 🟢 MOYENNE | Suppression doublons |
| `supabase/functions/purge-demandes-conges/index.ts` | 5 | 🟢 MOYENNE | Nettoyage demandes congés |
| `supabase/functions/purge-entreprise-complete/index.ts` | 5 | 🟢 MOYENNE | Purge entreprise complète |
| `supabase/functions/purge-all-test-data/index.ts` | 5 | 🟢 MOYENNE | Suppression données test |
| `supabase/functions/purge-transport-week/index.ts` | 5 | 🟢 MOYENNE | Nettoyage transport semaine |
| `supabase/functions/purge-week/index.ts` | 5 | 🟢 MOYENNE | Purge semaine complète |
| `supabase/functions/purge-entreprise-weeks/index.ts` | 5 | 🟢 MOYENNE | Purge semaines entreprise |
| `supabase/functions/purge-orphan-fiches/index.ts` | 5 | 🔵 BASSE | Deprecated mais à corriger |
| `supabase/functions/create-test-data-s45/index.ts` | 5 | 🔵 BASSE | Création données test |

### 3. Edge Functions de rappels (CRON - pas affectées par CORS mais cohérence)

| Fichier | Ligne | Priorité | Raison |
|---------|-------|----------|--------|
| `supabase/functions/rappel-conducteurs/index.ts` | 15 | 🔵 BASSE | Cohérence (pas appelé depuis frontend) |
| `supabase/functions/rappel-conducteurs-finisseurs/index.ts` | 15 | 🔵 BASSE | Cohérence (pas appelé depuis frontend) |
| `supabase/functions/rappel-chefs/index.ts` | 15 | 🔵 BASSE | Cohérence (pas appelé depuis frontend) |
| `supabase/functions/rappel-chefs-lundi/index.ts` | 15 | 🔵 BASSE | Cohérence (pas appelé depuis frontend) |

---

## Impact attendu

### Immédiat (après déploiement)
- ✅ Suppression de "TEST 2" fonctionnera
- ✅ Toutes les invitations utilisateurs fonctionneront
- ✅ Toutes les fonctions de purge dans AdminPanel seront débloquées
- ✅ Notifications conducteurs fonctionneront

### Long terme
- ✅ Cohérence CORS sur toutes les Edge Functions
- ✅ Compatibilité totale avec le header `x-entreprise-id` du système multi-tenant
- ✅ Prévention de futurs bugs CORS lors de l'ajout de nouvelles fonctionnalités

---

## Approche de déploiement

### Option 1 : Correction minimale urgente (recommandée)
Corriger uniquement les 3 fonctions critiques utilisées actuellement :
1. `delete-user` (bloqué maintenant)
2. `invite-user` (utilisé régulièrement)
3. `notify-conducteur` (utilisé pour les rappels manuels)

**Avantages :**
- Déblocage immédiat du problème actuel
- Déploiement rapide (3 fonctions)
- Risque minimal

**Inconvénients :**
- Il faudra revenir corriger les autres plus tard
- Risque d'oublier certaines fonctions

### Option 2 : Correction complète (recommandée pour la robustesse)
Corriger les 19 Edge Functions d'un coup.

**Avantages :**
- Résolution définitive et complète du problème
- Cohérence totale du système
- Évite de futurs bugs CORS similaires
- Une seule intervention

**Inconvénients :**
- Plus de fichiers modifiés (mais changement très simple)
- Temps de déploiement légèrement plus long

---

## Recommandation finale

**Je recommande l'Option 2 (correction complète)** pour les raisons suivantes :

1. **Simplicité du changement** : Ajouter 17 caractères (`, x-entreprise-id`) dans chaque fichier
2. **Prévention** : Évite que d'autres fonctionnalités (purge, debug) ne tombent en panne
3. **Cohérence** : Toutes les Edge Functions auront la même configuration CORS
4. **Maintenance** : Une seule intervention au lieu de corrections au coup par coup

Le changement est tellement simple et uniforme qu'il peut être fait en une seule passe sans risque d'erreur.

---

## Note technique importante

Les Edge Functions de rappels automatiques (`rappel-*`) sont déclenchées par des CRON jobs Supabase et ne passent pas par le navigateur, donc elles ne sont **pas affectées par CORS**. Cependant, il est recommandé de les corriger aussi pour :
- Maintenir la cohérence du code
- Permettre de les tester manuellement depuis le frontend (AdminPanel) si besoin
- Éviter toute confusion future

---

## Test de validation post-déploiement

Après déploiement, vérifier que :
1. ✅ La suppression de "TEST 2" fonctionne (bouton poubelle dans AdminPanel > Utilisateurs)
2. ✅ La console ne montre plus d'erreurs CORS pour `delete-user`
3. ✅ Les autres fonctions admin (invitations, purge) sont accessibles sans erreur CORS
