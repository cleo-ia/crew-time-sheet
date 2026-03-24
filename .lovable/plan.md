

## Analyse approfondie du plan V2 - Corrections et points d'attention

### Points forts du plan actuel
- Les deux points d'entree sont bien identifies (useUpdateFicheStatus + SignatureFinisseurs)
- La logique de resolution chantier via `code_chantier_du_jour` est correcte
- Le placement juste apres `injectValidatedLeaves` est le bon moment

### Problemes identifies et corrections

**1. Re-fetch inutile des fiches**
Le plan prevoit de re-fetcher les fiches pour obtenir `chantier_id` apres la mise a jour. C'est inutile et fragile. Il suffit d'ajouter `chantier_id` au `.select()` existant dans les deux points d'entree :
- `useFiches.ts` ligne 747 : `.select("id, salarie_id, semaine")` → `.select("id, salarie_id, semaine, chantier_id")`
- `SignatureFinisseurs.tsx` lignes 419/433 : idem

Cela evite une requete supplementaire et un risque de desynchronisation.

**2. Performance - eviter les boucles N+1**
Le plan actuel (inspire de `injectValidatedLeaves`) fait une boucle par fiche puis par jour → beaucoup de requetes unitaires. Pour 20 employes × 5 jours = potentiellement 100 requetes individuelles.

Approche optimisee :
- 1 seule requete pour charger TOUS les `fiches_jours` eligibles (`code_trajet = "A_COMPLETER"` ET `trajet_perso != true`) de toutes les fiches transmises
- 1 seule requete pour resoudre les `code_chantier_du_jour` uniques → `chantiers.id`
- 1 seule requete pour charger les `codes_trajet_defaut` pertinents (filtres par `entreprise_id` + `.in("salarie_id", [...]`)
- Puis en memoire : construire la map de lookup et faire les updates en batch

**3. Cas limites a gerer**

| Cas | Comportement |
|---|---|
| `code_trajet = "A_COMPLETER"` | Chercher dans la map → remplacer |
| `code_trajet = "GD"` | Ne pas toucher |
| `code_trajet = null` | Ne pas toucher (trajet non coche) |
| `trajet_perso = true` | Ne pas toucher |
| Mapping = `"AUCUN"` | Mettre `code_trajet = null` |
| Mapping inexistant (couple chantier/salarie non configure) | Laisser `"A_COMPLETER"` pour traitement RH manuel |
| `code_chantier_du_jour` non trouvable dans `chantiers` | Fallback sur `fiche.chantier_id` |
| `code_chantier_du_jour` vide/null | Utiliser `fiche.chantier_id` |

**4. Troisieme point d'entree deja couvert**
`FicheDetail.tsx` (validation conducteur) appelle `useUpdateFicheStatus` via `updateStatus.mutateAsync()` → deja couvert par le hook. Pas de modification supplementaire.

**5. Gestion d'erreur**
L'auto-fill ne doit JAMAIS bloquer la transmission. Si une erreur survient (table inaccessible, etc.), on log l'erreur et on continue. La fiche arrive au RH avec `A_COMPLETER` — le RH peut corriger manuellement comme avant.

---

### Plan corrige

**Fichier 1 : `src/hooks/useApplyDefaultCodesTrajet.ts` (nouveau)**

```text
applyDefaultCodesTrajet(fiches: { id, salarie_id, chantier_id }[])
  1. Collecter tous les fiche IDs et salarie IDs uniques
  2. Charger en 1 requete : fiches_jours WHERE fiche_id IN (...) 
     AND code_trajet = "A_COMPLETER" AND (trajet_perso IS NULL OR trajet_perso = false)
  3. Extraire les code_chantier_du_jour uniques non-null
  4. Resoudre en 1 requete : chantiers WHERE code_chantier IN (...) → map code→id
  5. Charger en 1 requete : codes_trajet_defaut WHERE entreprise_id = X 
     AND salarie_id IN (...)
     → map "(chantier_id, salarie_id)" → code_trajet
  6. Pour chaque fiches_jours eligible :
     - Determiner chantier_id effectif (code_chantier_du_jour resolu OU fiche.chantier_id)
     - Lookup dans la map
     - Si trouve et != "AUCUN" → update code_trajet
     - Si trouve et == "AUCUN" → update code_trajet = null
     - Si pas trouve → laisser "A_COMPLETER"
  7. Executer les updates en batch (par groupe de 50)
  8. Tout en try/catch — jamais de throw vers l'appelant
```

**Fichier 2 : `src/hooks/useFiches.ts`**
- Ligne 747 : ajouter `chantier_id` au select
- Apres ligne 768 (apres `injectValidatedLeaves`) : appeler `applyDefaultCodesTrajet(updatedFiches)`

**Fichier 3 : `src/pages/SignatureFinisseurs.tsx`**
- Lignes 419/433 : ajouter `chantier_id` au select
- Apres ligne 451 (apres `injectValidatedLeaves`) : appeler `applyDefaultCodesTrajet(fichesTransmises)`

---

### Ce qui ne change PAS
- Aucune migration DB
- Aucun changement UI
- Le comportement RH reste identique (les codes non resolus restent `A_COMPLETER`)
- `injectValidatedLeaves` continue de fonctionner avant l'auto-fill (ordre important : les conges injectent des jours a 0h sans trajet, donc pas de conflit)

