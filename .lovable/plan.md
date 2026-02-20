
# Confirmation : Passage en Mode Planning Complet

## Réponse directe à ta question

**OUI**, avec les 4 corrections identifiées, l'application passera en mode planning complet et `affectations_jours_chef` deviendra la seule source de vérité pour les équipes chefs. **NON**, rien ne cassera** si les corrections sont faites correctement — voici pourquoi, point par point.

---

## Ce qui existe aujourd'hui dans le code (état exact)

Après lecture complète des fichiers, voici les 4 points legacy encore actifs :

### Point 1 — `useMaconsByChantier.ts` (lignes 219-262)
Il y a **2 niveaux de legacy** :

- **Fallback interne en mode planning** (lignes 219-240) : Si `affectations_jours_chef` est vide pour une semaine validée, le code retombe sur la table `affectations` comme plan B.
- **Mode legacy complet** (lignes 241-262) : Si la semaine n'est pas validée, lecture systématique depuis `affectations` (ancienne table).

### Point 2 — `TimeEntryTable.tsx` (lignes 252-254 + ligne 281)
- **Chargement conditionnel** : `affectationsJoursChef` n'est chargé QUE si `isPlanningActive` est true. Si false → tableau vide → aucune vérification.
- **Bypass direct** ligne 281 : `if (!isPlanningActive) return true;` → tous les jours autorisés en mode legacy.

### Point 3 — `SignatureMacons.tsx` (lignes 39-43 + lignes 56-58)
- **Chargement conditionnel** : affectations jours chargées seulement si `isPlanningActive`.
- **Bypass filtrage** ligne 56-58 : `if (!isPlanningActive) { return macon; }` → tous les jours et toutes les heures affichées sans filtrage.

### Point 4 — `TransportDayAccordion.tsx` (ligne 124)
- `const affectationsJoursChef = isPlanningActive ? rawAffectationsJoursChef : [];`
- En mode legacy → tableau vide → le filtre conducteur s'applique à personne.

---

## Les corrections à appliquer (4 fichiers)

### `useMaconsByChantier.ts`
- **Supprimer** le bloc `else` complet (lignes 241-262) qui lit depuis `affectations`
- **Supprimer** le fallback interne (lignes 219-240) qui retombe sur `affectations` quand `affectations_jours_chef` est vide
- **Résultat** : si aucune donnée dans `affectations_jours_chef` pour une vieille semaine → équipe vide (correct)

### `TimeEntryTable.tsx`
- **Modifier** les lignes 252-254 : retirer `isPlanningActive &&` → charger toujours les affectations en mode chef
- **Supprimer** la ligne 281 : `if (!isPlanningActive) return true;`
- **Résultat** : la vérification des jours s'applique toujours, que la semaine soit validée ou non

### `SignatureMacons.tsx`
- **Modifier** les lignes 39-42 : retirer `isPlanningActive ?` → charger toujours les affectations
- **Supprimer** les lignes 56-58 : `if (!isPlanningActive) { return macon; }`
- **Résultat** : le filtrage par jours planifiés s'applique toujours lors de la collecte des signatures

### `TransportDayAccordion.tsx`
- **Modifier** la ligne 124 : `const affectationsJoursChef = rawAffectationsJoursChef;`
- **Résultat** : le filtre conducteur s'applique toujours, que la semaine soit validée ou non

---

## Garanties : ce qui ne changera PAS

| Élément | Pourquoi ça ne change pas |
|---|---|
| Chef lui-même → 5 jours toujours | La logique `isChefHimself` dans `useAutoSaveFiche` reste intacte |
| Mode conducteur (finisseurs) | Utilise `affectations_finisseurs_jours`, pas `affectations_jours_chef` |
| Mode RH / edit | `mode === "edit"` → `return true` toujours, aucune restriction |
| Fiches déjà validées | Les statuts VALIDE_CHEF / ENVOYE_RH ne sont pas touchés |
| Multi-chantier | Le filtre `chantier_id` dans les requêtes reste en place |
| Planning Main d'Oeuvre | Page non modifiée |
| Export Excel / Récap RH | Non modifiés, lisent directement les `fiches_jours` |

---

## Impact sur les vieilles semaines (S05 et avant)

Pour les semaines sans données dans `affectations_jours_chef` (avant la première sync) :
- **Vue chef** : équipe vide → normal, ce sont des semaines historiques non planifiées
- **Fiches existantes** : les données `fiches_jours` existent toujours en base → la vue RH / historique n'est pas affectée
- **L'application ne plante pas** : un tableau vide est géré partout

---

## Récapitulatif : avant / après

| Situation | Avant | Après |
|---|---|---|
| Semaine non validée — affichage équipe chef | Lit table `affectations` (legacy) | Lit `affectations_jours_chef` (vide si vieille semaine) |
| Semaine validée — fallback si vide | Retombe sur `affectations` | Retourne équipe vide (pas de données fantômes) |
| Saisie chef — jours autorisés | Tous les jours si semaine non validée | Uniquement les jours planifiés dans `affectations_jours_chef` |
| Signature maçons | Affiche tout si mode legacy | Filtre toujours par jours planifiés |
| Transport accordéon | Ignore le filtre conducteur si legacy | Applique toujours le filtre conducteur |
| Chef lui-même | 5 jours | 5 jours (inchangé) |
| Conducteur / finisseurs | Inchangé | Inchangé |
| RH / récap / export | Inchangé | Inchangé |

