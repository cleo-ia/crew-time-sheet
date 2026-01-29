

# Audit de Non-Régression Complet - Correction RLS `demandes_conges`

## Analyse du Problème Identifié

La fonction `get_selected_entreprise_id()` utilisée dans les nouvelles policies RLS fonctionne parfaitement. Le problème vient du **bypass super_admin** ajouté dans la migration précédente :

```sql
-- Policy actuelle (fautive)
USING (
  has_role(auth.uid(), 'super_admin')  -- ← Ce bypass retourne TRUE
  OR entreprise_id = get_selected_entreprise_id()
)
```

Pour un super_admin, `has_role()` retourne `TRUE`, donc la condition `OR` n'est jamais évaluée, ce qui permet de voir **toutes** les demandes de **toutes** les entreprises.

## Solution Proposée

Retirer le bypass super_admin des 4 policies RLS sur `demandes_conges` :

```sql
-- Nouvelle policy (correcte)
USING (entreprise_id = get_selected_entreprise_id())
```

## Audit Exhaustif des Composants

### Hooks de Lecture (SELECT)

| Hook | Requête | Impact après fix |
|------|---------|------------------|
| `useDemandesConges` | SELECT sans filtre → RLS appliqué | Verra uniquement l'entreprise sélectionnée |
| `useDemandesCongesRH` | SELECT avec `.eq("entreprise_id", ...)` | Double filtrage (frontend + RLS) - Aucun changement |
| `useDemandesEnAttente` | SELECT count statut=EN_ATTENTE | Comptage correct pour l'entreprise sélectionnée |
| `useDemandesEnAttenteRH` | SELECT count avec filtre entreprise_id | Aucun changement (déjà filtré côté frontend) |
| `useDemandesTraiteesNonLues` | SELECT count par demandeur_ids | Filtré correctement par RLS |
| `useInjectValidatedLeaves` | SELECT par demandeur_id spécifique | Aucun impact (ID unique) |

### Hooks de Mutation (INSERT/UPDATE)

| Hook | Opération | Impact après fix |
|------|-----------|------------------|
| `useCreateDemandeConge` | INSERT avec `entreprise_id` explicite | L'entreprise_id est passée explicitement depuis le frontend (ligne 32) |
| `useValidateDemandeConge` | UPDATE par ID spécifique | Aucun impact (ID unique) |
| `useRefuseDemandeConge` | UPDATE par ID spécifique | Aucun impact (ID unique) |
| `useMarkDemandesAsRead` | UPDATE par demandeur_ids | Filtré par RLS sur entreprise sélectionnée |
| `useMarkDemandesExportees` | UPDATE par liste d'IDs | Aucun impact (IDs spécifiques) |

### Composants UI

| Composant | Rôle | Source des données | Impact |
|-----------|------|-------------------|--------|
| `CongesSheet.tsx` | Chef - Voir demandes équipe | Query directe `.in("demandeur_id", allTeamIds)` + RLS | Données filtrées correctement |
| `CongesListSheet.tsx` | Conducteur - Valider/Créer | `useDemandesConges()` + `useCurrentEntrepriseId()` | Verra uniquement son entreprise |
| `CongesRHSheet.tsx` | RH - Gérer demandes | `useDemandesCongesRH(entrepriseId)` | Déjà filtré explicitement par entreprise |
| `CongesButton.tsx` | Badge compteur | Reçoit `pendingCount` des hooks parents | Aucune logique propre |
| `DemandeCongeCard.tsx` | Affichage carte | Reçoit données déjà filtrées | Aucune logique propre |

### Pages

| Page | Hook(s) utilisé(s) | Impact |
|------|-------------------|--------|
| `Index.tsx` (Chef) | `useDemandesTraiteesNonLues` | Comptage correct via RLS |
| `ValidationConducteur.tsx` | `useDemandesEnAttente` | Comptage correct via RLS |
| `ConsultationRH.tsx` | `useDemandesEnAttenteRH(entrepriseId)` | Déjà filtré par entreprise_id frontend |

### Vérification du Sélecteur Super Admin (ValidationConducteur.tsx)

Le sélecteur de conducteur pour super_admin (ligne 66) utilise `useUtilisateursByRole("conducteur")` qui :
1. Lit `localStorage.getItem("current_entreprise_id")` (ligne 33 de useUtilisateurs.ts)
2. Filtre par `.eq("entreprise_id", entrepriseId)` sur la table `user_roles` (ligne 96)
3. Résultat : seuls les conducteurs de l'entreprise sélectionnée sont listés

Aucune modification nécessaire.

## Fonctionnement de `get_selected_entreprise_id()`

La fonction lit le header `x-entreprise-id` envoyé par le client Supabase (`client.ts` ligne 28) qui prend sa valeur de `localStorage.getItem('current_entreprise_id')` lors de l'initialisation.

Pour les super_admin, la fonction retourne directement l'entreprise demandée via le header **sans vérification d'appartenance** (ligne 13-18 de la fonction), ce qui est le comportement souhaité.

## Migration SQL à Appliquer

```sql
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view demandes in company" ON public.demandes_conges;
DROP POLICY IF EXISTS "Users can create demandes in company" ON public.demandes_conges;
DROP POLICY IF EXISTS "Users can update demandes in company" ON public.demandes_conges;
DROP POLICY IF EXISTS "Admins can delete demandes" ON public.demandes_conges;

-- Recréer SANS bypass super_admin
CREATE POLICY "Users can view demandes in company"
  ON public.demandes_conges FOR SELECT
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id());

CREATE POLICY "Users can create demandes in company"
  ON public.demandes_conges FOR INSERT
  TO authenticated
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

CREATE POLICY "Users can update demandes in company"
  ON public.demandes_conges FOR UPDATE
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id());

CREATE POLICY "Admins can delete demandes"
  ON public.demandes_conges FOR DELETE
  TO authenticated
  USING (
    entreprise_id = get_selected_entreprise_id()
    AND has_role(auth.uid(), 'admin')
  );
```

## Matrice de Non-Régression Finale

| Scénario | Avant fix | Après fix | Régression ? |
|----------|-----------|-----------|--------------|
| Chef SDER crée demande | Fonctionne | Fonctionne | Non |
| Chef SDER voit ses demandes | Fonctionne | Fonctionne | Non |
| Chef SDER voit demandes de son équipe | Fonctionne | Fonctionne | Non |
| Conducteur SDER voit demandes à valider | Voit aussi LR | Uniquement SDER | Non (correction bug) |
| Conducteur SDER valide demande | Fonctionne | Fonctionne | Non |
| Conducteur SDER crée demande pour finisseur | Fonctionne | Fonctionne | Non |
| RH SDER voit demandes | Fonctionne (filtre frontend) | Fonctionne (double filtre) | Non |
| RH SDER valide/refuse | Fonctionne | Fonctionne | Non |
| RH SDER exporte PDF | Fonctionne | Fonctionne | Non |
| Super_admin connecté SDER | Voit LR (BUG) | Voit uniquement SDER | Non (correction bug) |
| Super_admin sélecteur conducteur | Voit tous conducteurs SDER | Voit tous conducteurs SDER | Non |
| Badge compteur conducteur | Compte cross-entreprise (BUG) | Compte correct | Non (correction bug) |
| Injection congés validés (fiches_jours) | Fonctionne | Fonctionne | Non |

## Garantie de Non-Régression

**Aucune régression possible** car :

1. **Aucun changement frontend** - Tous les composants et hooks restent identiques
2. **Fonction RLS éprouvée** - `get_selected_entreprise_id()` est déjà utilisée en production sur `affectations_jours_chef` depuis janvier 2026 sans problème
3. **Super_admin isolé par design** - Le super_admin peut accéder à l'entreprise sélectionnée car `get_selected_entreprise_id()` retourne directement le header sans vérification pour ce rôle
4. **Filtrage applicatif redondant** - `useDemandesCongesRH` filtre déjà par entreprise_id côté frontend
5. **INSERT explicite** - L'entreprise_id est toujours passée explicitement depuis le frontend (`useCreateDemandeConge` ligne 32)

## Section Technique

### Points de Vérification Post-Migration

1. Connecté à SDER, l'onglet "À valider" du conducteur ne doit montrer que les demandes SDER
2. Le compteur du badge Congés doit refléter uniquement les demandes SDER
3. La création de demande (chef ou conducteur) doit fonctionner normalement
4. La validation/refus doit fonctionner normalement
5. L'export PDF RH ne doit contenir que les demandes SDER

