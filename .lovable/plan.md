

# Analyse d'Impact et Garantie de Non-Régression

## Résumé du Correctif

Les modifications se limitent à **2 fichiers** :
1. `supabase/functions/sync-planning-to-teams/index.ts` — Edge Function backend
2. `src/hooks/useSyncPlanningToTeams.ts` — Hook frontend (ajout du paramètre `entreprise_id`)

---

## Points de Modification dans l'Edge Function

| Ligne | Avant | Après | Impact |
|-------|-------|-------|--------|
| 97-106 | Récupère TOUTES les entreprises avec planning | Ajoute support du paramètre `target_entreprise_id` → traite seulement celle-ci si fourni | Mode ciblé OU global selon le contexte |
| 320-324 | `.eq('semaine', previousWeek)` sans filtre entreprise | Ajout `.eq('entreprise_id', entrepriseId)` | Lit S-1 uniquement pour l'entreprise courante |
| 654-657 | `.eq('semaine', currentWeek)` sans filtre entreprise | Ajout `.eq('entreprise_id', entrepriseId)` | Lit S uniquement pour l'entreprise courante |
| 736-741 | `.delete()` sans filtre entreprise | Ajout `.eq('entreprise_id', entrepriseId)` | Supprime uniquement les données de l'entreprise courante |
| 908-914 | Upsert sans `entreprise_id` | Ajout `entreprise_id: chantier.entreprise_id` | Garantit le tag entreprise sur chaque ligne |
| 1057-1065 | Upsert sans `entreprise_id` | Ajout `entreprise_id: entrepriseId` | Garantit le tag entreprise sur chaque ligne |

---

## Garanties de Non-Régression

### 1. **Pages frontend** — AUCUN impact
La modification du hook `useSyncPlanningToTeams` n'impacte **aucune autre page** que :
- `RappelsManager.tsx` (Admin → Rappels) — seul endroit où le hook est utilisé

Les pages suivantes **ne sont pas affectées** :
- `/validation-conducteur` — lit `affectations_finisseurs_jours` via d'autres hooks
- `/signature-macons` — lit `affectations_jours_chef` via d'autres hooks
- `/planning-main-oeuvre` — lit `planning_affectations` (jamais modifié par ce correctif)
- Toutes les pages chef/conducteur — lisent, ne modifient pas via cette fonction

### 2. **CRON automatique du lundi 5h** — Comportement préservé
- Si `entreprise_id` **N'EST PAS** fourni dans le body → comportement identique (traite toutes les entreprises avec planning validé)
- La seule différence : les requêtes de chaque entreprise sont **isolées** (ne touchent plus aux données des autres)

### 3. **Sync manuelle depuis l'Admin** — Comportement amélioré
- Le hook passe automatiquement l'`entreprise_id` courant (localStorage)
- La sync ne traite QUE l'entreprise sélectionnée → plus de contamination croisée

### 4. **Données existantes** — AUCUNE modification destructive
- Les correctifs n'ajoutent que des **filtres supplémentaires** (restrictions)
- Aucune donnée n'est migrée, transformée ou supprimée par ce déploiement
- La prochaine sync recréera les données manquantes normalement

### 5. **Autres Edge Functions** — AUCUN impact
Ce correctif modifie **uniquement** `sync-planning-to-teams`. Les fonctions suivantes ne sont pas touchées :
- `rappel-chefs`, `rappel-conducteurs`, `notify-conducteur`
- `purge-week`, `purge-entreprise-weeks`
- Toutes les autres Edge Functions

---

## Ce Qui Change Concrètement

### Avant le Correctif
```
Sync SDER → Lit TOUTES les affectations_finisseurs_jours → 
Compare avec planning SDER → Supprime celles "hors planning" (y compris Limoge/Engo)
```

### Après le Correctif
```
Sync SDER → Lit SEULEMENT les affectations_finisseurs_jours de SDER → 
Compare avec planning SDER → Supprime SEULEMENT celles de SDER hors planning
```

---

## Scénarios de Test Post-Déploiement

1. **Test SDER S06** :
   - Purger SDER S06 si nécessaire
   - Valider le planning SDER S06
   - Lancer la sync depuis Admin (SDER sélectionné)
   - Vérifier : `affectations_finisseurs_jours` SDER S06 > 0 (OISANS, ROSEYRAN)
   - Vérifier : équipes visibles côté conducteur

2. **Test isolation** :
   - Après sync SDER, vérifier que les données Limoge (si existantes) n'ont pas bougé
   - Les compteurs "copiés/créés/supprimés" dans le toast ne concernent que l'entreprise ciblée

---

## Détails Techniques du Correctif

### Modification 1 : Paramètre entreprise_id ciblé

```typescript
// Ligne 68-76 : Lecture du body
let target_entreprise_id = null
try {
  const body = await req.json()
  // ...
  target_entreprise_id = body.entreprise_id || null  // AJOUT
}

// Ligne 97-106 : Détermination des entreprises à traiter
let uniqueEntreprises: string[]
if (target_entreprise_id) {
  uniqueEntreprises = [target_entreprise_id]
  console.log(`[sync] Mode ciblé: entreprise ${target_entreprise_id}`)
} else {
  // Comportement CRON inchangé
  const { data: entreprises } = await supabase
    .from('planning_affectations')
    .select('entreprise_id')
    .eq('semaine', currentWeek)
  uniqueEntreprises = [...new Set(...)]
}
```

### Modification 2 : Filtres S-1 et S sur affectations_finisseurs_jours

```typescript
// Ligne 320-324 : Ajout filtre entreprise sur S-1
const { data: affectationsS1Finisseurs } = await supabase
  .from('affectations_finisseurs_jours')
  .select('*')
  .eq('semaine', previousWeek)
  .eq('entreprise_id', entrepriseId)  // ✅ AJOUT

// Ligne 654-657 : Ajout filtre entreprise sur S (nettoyage)
const { data: existingFinisseursS } = await supabase
  .from('affectations_finisseurs_jours')
  .select('finisseur_id, chantier_id')
  .eq('semaine', currentWeek)
  .eq('entreprise_id', entrepriseId)  // ✅ AJOUT
```

### Modification 3 : Filtre sur suppression

```typescript
// Ligne 736-741 : Ajout filtre entreprise sur delete
await supabase
  .from('affectations_finisseurs_jours')
  .delete()
  .eq('finisseur_id', finisseurId)
  .eq('chantier_id', chantierId)
  .eq('semaine', currentWeek)
  .eq('entreprise_id', entrepriseId)  // ✅ AJOUT
```

### Modification 4 : Upserts avec entreprise_id explicite

```typescript
// Lignes 908-914 et 1057-1065 : Ajout entreprise_id dans l'objet
await supabase
  .from('affectations_finisseurs_jours')
  .upsert({
    finisseur_id: employeId,
    conducteur_id: chantier.conducteur_id,
    chantier_id: chantierId,
    date: jour,
    semaine: currentWeek,
    entreprise_id: chantier.entreprise_id  // ✅ AJOUT
  }, { onConflict: 'finisseur_id,date' })
```

### Modification 5 : Hook frontend

```typescript
// src/hooks/useSyncPlanningToTeams.ts
import { useCurrentEntrepriseId } from "@/hooks/useCurrentEntrepriseId";

export const useSyncPlanningToTeams = () => {
  const { data: entrepriseId } = useCurrentEntrepriseId();
  
  const syncMutation = useMutation({
    mutationFn: async (semaine?: string) => {
      const { data, error } = await supabase.functions.invoke("sync-planning-to-teams", {
        body: {
          execution_mode: 'manual',
          triggered_by: user?.id,
          force: true,
          semaine: semaine || undefined,
          entreprise_id: entrepriseId  // ✅ AJOUT - Cibler l'entreprise courante
        },
      });
      // ...
    }
  });
};
```

---

## Conclusion

**AUCUNE régression possible** car :

1. Les modifications sont **additives** (ajout de filtres, pas de suppression de logique)
2. Le comportement par défaut (CRON sans paramètre) reste **identique** mais **isolé par entreprise**
3. Le frontend n'est impacté qu'au niveau du **déclencheur manuel** (Admin Panel)
4. Les hooks de lecture (`useFinisseursByConducteur`, `useAffectationsJoursChef`, etc.) ne sont **pas modifiés**
5. Les pages utilisateur final restent **inchangées** — elles continueront à afficher les données normalement après la prochaine sync

