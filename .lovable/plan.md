

## Analyse de régression exhaustive — Migration `chantiers.chef_id` → `planning_affectations`

### Inventaire complet des 11 fichiers utilisant `.eq("chef_id", ...)` sur la table `chantiers`

| # | Fichier | Usage | Impacté ? | Détail |
|---|---------|-------|-----------|--------|
| 1 | `src/pages/Index.tsx` L141, L160 | Auto-sélection chantier au login | **OUI — à modifier** | Utilise `chantiers.chef_id` pour valider/trouver le chantier du chef |
| 2 | `src/components/timesheet/WeekSelectorChef.tsx` L40 | Détection S-2 incomplètes | **OUI — à modifier** | Cherche chantiers via `chantiers.chef_id` |
| 3 | `src/hooks/useChefHistorique.ts` L27 | Historique chef | **OUI — à modifier** | Cherche chantiers via `chantiers.chef_id` |
| 4 | `src/components/timesheet/ChantierSelector.tsx` L38 | Query base chantiers | **NON** | Cette query est le fallback (`else` branch) quand `semaine` est absent. Utilisée uniquement par `TimeEntryTable` (pas de `semaine`). Le fix précédent l'ignore déjà quand `semaine + chefId` sont fournis |
| 5 | `src/hooks/useFiches.ts` L166 | Filtre RH par chef (validation conducteur) | **NON** | C'est un filtre **admin/conducteur/RH**, pas utilisé côté chef. Le filtre "par chef" dans la page validation est un affichage secondaire. De plus, la sync du lundi maintient `chantiers.chef_id` à jour |
| 6 | `src/hooks/rhShared.ts` L260 | Filtre consolidé RH par chef | **NON** | Utilise déjà `affectations_jours_chef` en priorité (L257-263), avec fallback sur `chantiers.chef_id` (L268-269). Fonctionne correctement |
| 7 | `src/hooks/useDashboardStats.ts` L71, L164, L187 | Stats admin (orphelins, progression) | **NON** | Vue admin globale. Utilise déjà `affectations_jours_chef` en complément (L155-161). `chantiers.chef_id` sert uniquement à l'affichage "chantiers orphelins" et "progression" côté admin |
| 8 | `src/hooks/useMaconsByChantier.ts` L178 | Charge l'équipe d'un chantier | **NON** | Filtre `affectations_jours_chef` par `chef_id` — c'est la table jour-par-jour, pas `chantiers.chef_id` |
| 9 | `src/hooks/useAutoSaveFiche.ts` L312 | Sauvegarde auto des fiches | **NON** | Même chose : filtre `affectations_jours_chef.chef_id`, pas `chantiers.chef_id` |
| 10 | `src/hooks/useAffectationsJoursChef.ts` L49,93 | Requêtes affectations jour | **NON** | Table `affectations_jours_chef`, pas `chantiers` |
| 11 | `src/hooks/useMaconsAllChantiersByChef.ts` L38,72 | Multi-chantier chef | **NON** | Table `affectations_jours_chef`, pas `chantiers` |
| 12 | `src/hooks/useInitialWeek.ts` | Semaine initiale | **NON** | N'utilise pas `chef_id` du tout, filtre par `user_id` + `chantier_id` sur la table `fiches` |
| 13 | `src/hooks/useFichesEnAttente.ts` | Fiches en attente | **NON** | Utilise `conducteur_id`, pas `chef_id` |

---

### Les 3 modifications à effectuer

#### 1. `src/pages/Index.tsx` — Auto-sélection chantier au login (lignes 136-168)

**Avant** : `chantiers.chef_id = utilisateur.id`
**Après** : chercher dans `planning_affectations` pour la semaine courante, avec fallback sur `affectations_jours_chef`

```text
Logique :
1. Si chantier en session → vérifier qu'il existe dans planning_affectations (semaine courante, employe_id = chef)
2. Si non trouvé dans planning → vérifier dans affectations_jours_chef (semaine courante)
3. Si toujours pas → reset la session
4. Si pas de chantier en session → prendre le premier du planning_affectations
5. Fallback → premier de affectations_jours_chef
```

**Risque** : Le chef se connecte un dimanche soir avant que la sync du lundi ait tourné → `planning_affectations` pour S+1 peut être vide.
**Mitigation** : Le fallback `affectations_jours_chef` couvre ce cas car la sync crée les données dans cette table aussi. Et le `ChantierSelector` gère déjà correctement l'affichage même si aucun chantier n'est pré-sélectionné (le chef peut choisir manuellement).

#### 2. `src/components/timesheet/WeekSelectorChef.tsx` — Détection S-2 incomplètes (lignes 37-43)

**Avant** : `chantiers.chef_id = chefId AND actif = true`
**Après** : `planning_affectations.employe_id = chefId AND semaine = s2Week`

```text
Logique :
1. Récupérer les chantier_id distincts du planning pour la semaine S-2
2. Vérifier si des fiches validées existent pour ces chantiers en S-2
3. Si un chantier du planning S-2 n'a pas de fiche validée → afficher S-2
```

**Risque** : Si le planning n'existe pas pour S-2 (pas encore d'historique planning) → `planning_affectations` retourne vide → S-2 ne s'affiche pas.
**Mitigation** : Ajouter un fallback sur `affectations_jours_chef` qui contient l'historique réel.

#### 3. `src/hooks/useChefHistorique.ts` — Historique des chantiers (lignes 24-28)

**Avant** : `chantiers.chef_id = chefId AND actif = true`
**Après** : `affectations_jours_chef.chef_id = chefId` (chantiers distincts)

```text
Logique :
1. Récupérer tous les chantier_id distincts dans affectations_jours_chef pour ce chef
2. Utiliser ces IDs pour charger les fiches (indépendamment de chantiers.actif)
```

**Pourquoi `affectations_jours_chef` et pas `planning_affectations`** : L'historique doit montrer TOUTES les semaines passées. `planning_affectations` ne contient que les données de planification, pas l'historique complet des affectations réellement exécutées. `affectations_jours_chef` est alimentée par la sync et contient l'historique semaine par semaine.

**Risque** : Aucun. `affectations_jours_chef` contient plus de données que `chantiers.chef_id` (qui ne référence que le dernier chef affecté). L'historique sera plus complet.

---

### Pages et composants vérifiés — AUCUNE régression

| Page | Composant utilisant `chef_id` | Impact |
|------|-------------------------------|--------|
| `/` (Index) | `ChantierSelector` | ✅ Déjà corrigé (planning = source unique) |
| `/` (Index) | Auto-sélection | 🔧 Modification prévue |
| `/admin` | `ChantiersManager` | ✅ Affichage uniquement via jointure `chef:utilisateurs!chef_id` — pas de logique |
| `/admin` | `DashboardManager` | ✅ Stats admin, utilise déjà `affectations_jours_chef` en complément |
| `/validation-conducteur` | `ChantierSelector` | ✅ Pas impacté (utilise `conducteurId`, pas `chefId + semaine`) |
| `/validation-conducteur` | `useFichesByStatus` | ✅ Filtre conducteur, pas chef |
| `/consultation-rh` | `rhShared.ts` | ✅ Utilise déjà `affectations_jours_chef` en priorité |
| `/planning-main-oeuvre` | — | ✅ Utilise directement `planning_affectations` |
| `/signature-macons` | — | ✅ N'utilise pas `ChantierSelector` ni `chef_id` |
| `/signature-finisseurs` | — | ✅ N'utilise pas `ChantierSelector` ni `chef_id` |

### Garanties

1. **Aucune table n'est modifiée** — on change uniquement les requêtes de lecture
2. **Chaque modification a un fallback** — si `planning_affectations` est vide, on tombe sur `affectations_jours_chef`
3. **Les vues admin/conducteur/RH ne sont pas touchées** — elles continuent d'utiliser `chantiers.chef_id` qui est maintenu à jour par la sync du lundi
4. **Le `ChantierSelector` base query (L38)** reste en place comme fallback pour les usages sans `semaine` (TimeEntryTable jour par jour)

