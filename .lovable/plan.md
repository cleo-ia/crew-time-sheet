

## Purge automatique des affectations et fiches parasites lors de la creation/modification d'un ALD

### Contexte
Quand un ALD est declare apres que le planning ait ete valide, les affectations et fiches existantes ne sont pas nettoyees. Le chef rouvre sa page, l'auto-save recree des fiches 0h sans type_absence, ce qui declenche le badge "absence a qualifier" en RH.

### Correction 1 : Purge a la creation/modification d'un ALD

**Fichier : `src/hooks/useAbsencesLongueDuree.ts`**

Apres l'insertion/update de l'ALD et la creation de la fiche ghost, ajouter une fonction `purgeAffectationsForALD` qui :

1. Calcule les dates couvertes par l'ALD (de `date_debut` a `date_fin` ou aujourd'hui + 2 semaines si pas de fin)
2. Supprime les `planning_affectations` de ce salarie sur ces jours
3. Supprime les `affectations_jours_chef` de ce salarie (`macon_id`) sur ces jours
4. Supprime les `affectations_finisseurs_jours` de ce salarie (`finisseur_id`) sur ces jours
5. Supprime les `fiches_jours` parasites (0h, `type_absence IS NULL`) de ce salarie sur ces jours (jointes via `fiches` ayant un `chantier_id` non null)
6. Supprime les `fiches` parasites resultantes si elles n'ont plus de `fiches_jours`

Cette fonction est appelee dans `useCreateAbsenceLongueDuree` (apres insert) et dans `useUpdateAbsenceLongueDuree` (apres update, en cas de changement de dates).

### Correction 2 : Renforcer le filtre ALD dans sync-planning-to-teams

**Fichier : `supabase/functions/sync-planning-to-teams/index.ts`**

La fonction `createNewAffectation` filtre deja les jours ALD (lignes 1884-1911). Le vrai trou est **en amont** : les affectations (`affectations_jours_chef`, `affectations_finisseurs_jours`) sont creees pour tous les employes du planning AVANT l'appel a `createNewAffectation`. Il faut ajouter un filtre ALD a ce niveau.

Dans la boucle principale de `syncEntreprise`, apres avoir recupere les `absencesLD` (ligne 1597), construire un `Map<salarie_id, Set<date>>` des jours bloques. Puis, lors de la creation des affectations (upsert `affectations_jours_chef` et `affectations_finisseurs_jours`), skipper les jours bloques par ALD.

### Garantie zero regression

| Risque | Protection |
|---|---|
| Suppression de donnees validees | On ne supprime que les `fiches_jours` avec `heures = 0` ET `type_absence IS NULL` sur des fiches avec `chantier_id` non null. Les fiches ghost (chantier_id null) et les fiches validees ne sont jamais touchees |
| Suppression d'affectations sur des jours non concernes | On filtre strictement par `date >= date_debut` ET `date <= date_fin` (ou sans borne si pas de date_fin) |
| Impact sur les fiches deja saisies par le chef | On ne supprime que les fiches_jours a 0h sans type_absence. Si le chef a deja saisi des heures, le jour n'est pas touche |
| Sync du lundi casse | La logique existante de `createNewAffectation` est deja protegee. On ajoute un filtre supplementaire en amont qui est coherent |
| Purge trop large sur update | Sur update d'ALD, on ne purge que si `date_debut` ou `date_fin` changent, et uniquement sur la nouvelle plage |

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/hooks/useAbsencesLongueDuree.ts` | Ajout `purgeAffectationsForALD()`, appelee dans create et update |
| `supabase/functions/sync-planning-to-teams/index.ts` | Filtre ALD en amont des upserts d'affectations |

