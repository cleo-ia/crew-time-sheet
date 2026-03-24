

# Plan : Paie Prévisionnelle basée sur le Planning S+1

## Contexte

Remplacer le clonage de la "Semaine Socle" par une estimation basée sur les affectations réelles du planning (`planning_affectations`), remplies par les conducteurs chaque mercredi.

## Logique d'estimation — Ordre de priorité

Pour chaque jour ouvrable manquant du mois :

1. **Planning direct** — Affectation existante dans `planning_affectations` pour ce salarié à cette date
2. **Clone du planning S-1** — Même jour de la semaine dans la semaine précédente (ex: lundi S14 → lundi S13)
3. **Semaine Socle** — Fallback actuel si le salarié n'est pas dans le planning
4. **Fallback optimiste** — 39h standard, panier, T1

Heures et accessoires par jour estimé :
- **Heures** : 8h (lun-jeu), 7h (vendredi)
- **Panier** : oui (sauf apprenti)
- **Trajet** : `codes_trajet_defaut[chantier_id + salarié_id]` → sinon trajet le plus fréquent des jours réels → sinon T1
- **Chantier** : `code_chantier` et `ville` du chantier affecté

## Modifications techniques

### `src/hooks/usePaiePrevisionnelle.ts`

**Nouvelle fonction `fetchPlanningForEstimation`** :
- Paramètres : `salarieIds[]`, `datesManquantes[]`, `entrepriseId`
- Requête 1 : `planning_affectations` filtrée par `employe_id` IN salarieIds + dates manquantes → `Map<salarieId+date, chantier_id>`
- Pour les dates sans résultat : calculer les dates S-1 correspondantes (même jour de semaine, semaine précédente)
- Requête 2 (si nécessaire) : `planning_affectations` pour ces dates S-1
- Requête 3 : `chantiers` pour résoudre `code_chantier` et `ville`
- Retourne `Map<salarieId+date, { chantierId, chantierCode, chantierVille }>`

**Modification de `generateEstimatedDays`** :
- Devient `async`, accepte un nouveau paramètre `planningMap` (optionnel)
- Nouveau cas prioritaire avant la semaine socle : si `planningMap` a une entrée pour la date → jour estimé avec chantier du planning + heures standard + trajet résolu
- Dates non couvertes → fallback semaine socle / optimiste existant

### `src/hooks/rhShared.ts`

Dans `buildRHConsolidation` :
- **En amont** (1 requête batch) : charger toutes les `planning_affectations` pour `entreprise_id` + plage de dates manquantes du mois
- **En amont** (1 requête batch) : charger tous les `codes_trajet_defaut` pour résoudre les trajets
- Passer le `planningMap` résolu à `generateEstimatedDays` pour chaque salarié

### Aucune migration BDD

`planning_affectations` existe déjà avec `employe_id`, `chantier_id`, `jour`, `semaine`, `entreprise_id`.

### Aucun changement UI

Flag `is_estimated: true` conservé. Badge popover existant dans RHPreExport inchangé. Snapshot M-1 et régularisation identiques.

## Flux résumé

```text
Export paie (20 mars, S12)
│
├─ Jours réels (S10, S11, S12) → fiches_jours ✅
│
├─ Jours manquants S13 (24-28 mars)
│   └─ Planning S13 rempli le 18/03 ✅
│       └─ Chantier affecté + 8h/7h + trajet défaut
│
├─ Jours manquants S14 (30-31 mars)
│   └─ Planning S14 pas encore rempli ❌
│       └─ Clone S13 (lun S13→lun S14, mar S13→mar S14)
│           └─ Chantier affecté + 8h/7h + trajet défaut
│
└─ Salarié absent du planning ?
    └─ Fallback semaine socle / optimiste
```

