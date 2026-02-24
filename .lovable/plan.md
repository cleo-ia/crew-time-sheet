

## Problème

Dans `sync-planning-to-teams`, quand un chef multi-chantier est traité comme "chef secondaire" sur un chantier (lignes 616-636), ses `fiches_jours` sont pré-remplis avec :
- **8h** (L-J) / **7h** (V)
- **T: 1** (trajet)
- **PA: true** (panier)
- **code_trajet: "A_COMPLETER"**
- **repas_type: "PANIER"**

Or, le bandeau info bleu dit au chef que ses heures sur le chantier secondaire sont **initialisées à 0h** pour éviter les doublons. Il y a donc une incohérence entre la sync et l'UI.

## Correction

**Fichier : `supabase/functions/sync-planning-to-teams/index.ts` (lignes 616-636)**

Changer l'initialisation des `fiches_jours` pour un chef sur son chantier secondaire :

| Champ | Avant | Après |
|-------|-------|-------|
| `heures` | 8h/7h | **0** |
| `HNORM` | 8h/7h | **0** |
| `T` | 1 | **0** |
| `PA` | true | **false** |
| `code_trajet` | "A_COMPLETER" | **null** |
| `repas_type` | "PANIER" | **null** |

Et mettre `total_heures` à **0** au lieu de `totalHeuresChefSec` (ligne 642).

**Condition** : ce comportement ne s'applique que quand le chef est sur son **chantier secondaire** (pas son `chantier_principal_id`). On distingue :
- **Chantier principal** → le chef gère l'équipe normalement (traitement standard)
- **Chantier secondaire** → fiche initialisée à 0h/0T/0PA

La distinction se fait via `chefPrincipalMap` déjà disponible dans la fonction (ligne 535).

**Note** : Le comportement pour les chefs "secondaires" au sens multi-chefs (2 chefs sur le même chantier) reste inchangé — ce cas est déjà corrigé par le fix précédent (chef solo = auto-responsable).

## Impact

- Aucun changement UI nécessaire
- Aucun changement de schema DB
- Seul le edge function est modifié
- Re-déploiement + re-sync nécessaire pour S15

