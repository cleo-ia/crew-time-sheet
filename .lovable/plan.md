

## Résumé du problème

Quand le planning est modifié en cours de semaine (ex: CAETANO passe de chantier A vers chantier C), la sync crée la fiche pour le nouveau chantier C mais **protège** la fiche existante sur chantier A si elle contient des heures (`total_heures > 0`) ou un statut avancé. Résultat : deux fiches couvrent les mêmes dates pour le même salarié, et les indicateurs RH (trajet `A_COMPLETER`, absence `A_QUALIFIER`) restent allumés sur la fiche fantôme.

Le problème vient de la logique de "protection" dans `copyFichesFromPreviousWeek` (L1693) et `createNewAffectation` (L1935) : elles refusent de toucher aux fiches avec heures > 0, même quand le planning a changé.

---

## Principe directeur

**Le planning est la source de vérité absolue.** La sync doit strictement refléter l'état du planning : créer les fiches/jours pour les affectations actuelles, supprimer celles qui ne correspondent plus, sans exception de "protection" sur les heures.

---

## Plan d'implémentation

### 1. Edge Function `sync-planning-to-teams` — Suppression stricte des fiches orphelines

**Fichier:** `supabase/functions/sync-planning-to-teams/index.ts`

**Modification A — Supprimer la protection par statut dans la phase "nettoyage fiches orphelines" (L1344-1397)**

Actuellement, les fiches avec statut `VALIDE_CHEF`, `VALIDE_CONDUCTEUR`, `ENVOYE_RH`, `AUTO_VALIDE`, `CLOTURE` sont protégées. Nouveau comportement :
- Seul le statut `CLOTURE` reste protégé (période clôturée = intouchable)
- Tous les autres statuts (`BROUILLON`, `VALIDE_CHEF`, `VALIDE_CONDUCTEUR`, `ENVOYE_RH`, `AUTO_VALIDE`) seront supprimés si le couple `(salarie_id, chantier_id)` n'est plus dans le planning

**Modification B — Supprimer la protection par heures dans `copyFichesFromPreviousWeek` (L1693-1726) et `createNewAffectation` (L1935-1966)**

Actuellement, si une fiche existe avec `total_heures > 0`, on ne touche pas aux `fiches_jours` et on crée seulement les affectations. Nouveau comportement :
- Si le planning assigne l'employé sur CE chantier → **écraser** les `fiches_jours` avec les données du planning (les heures modifiées par le chef/conducteur seront perdues — c'est voulu car le planning prime)
- Les `fiches_jours` hors des jours du planning sont supprimés
- Le `total_heures` est recalculé

**Modification C — Même suppression stricte pour les affectations hors planning (L1168-1264)**

Aligner la suppression des fiches associées aux affectations supprimées : seul `CLOTURE` reste protégé.

**Modification D — Ajouter une phase de nettoyage anti-doublon `(salarie_id, date)` post-sync**

Après toutes les créations/copies, ajouter une étape finale :
1. Requêter toutes les `fiches_jours` de la semaine groupées par `(salarie_id, date)` via un JOIN sur `fiches`
2. Pour chaque collision (même salarié, même date, fiches chantier différentes) :
   - Conserver la ligne dont le `chantier_id` correspond à l'affectation du planning pour ce jour
   - Supprimer les autres lignes
   - Recalculer `total_heures` sur les fiches affectées
   - Si une fiche se retrouve avec 0 jours, la supprimer

### 2. Frontend `rhShared.ts` — Garde-fou défensif de déduplication

**Fichier:** `src/hooks/rhShared.ts`

**Modification dans le bloc non-chef (L652-663)**

Quand `entries.length > 1` pour un non-chef, la logique actuelle choisit simplement le meilleur statut. Ajouter une logique de priorisation supplémentaire :
- Si une entrée a `code_trajet = "A_COMPLETER"` et une autre a un vrai code trajet → exclure l'entrée `A_COMPLETER`
- Si une entrée a `type_absence = "A_QUALIFIER"` et une autre a un vrai type → exclure l'entrée `A_QUALIFIER`
- Puis appliquer le tri par statut sur les entrées restantes

C'est un filet de sécurité : si la sync fait bien son travail (point 1), ce code ne sera jamais atteint.

---

## Fichiers modifiés

| Fichier | Nature |
|---------|--------|
| `supabase/functions/sync-planning-to-teams/index.ts` | Suppression de la protection par heures/statut, ajout phase anti-doublon post-sync |
| `src/hooks/rhShared.ts` | Garde-fou déduplication non-chef |

## Risques et mitigations

- **Perte de données saisies** : si un conducteur a saisi des heures puis le planning change, les heures seront écrasées. C'est le comportement voulu (planning = source de vérité). Le conducteur devra re-saisir après la re-sync.
- **Statut CLOTURE** : reste protégé pour éviter de toucher aux périodes déjà exportées en paie.

