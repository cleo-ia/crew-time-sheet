
# Plan de correction : Éliminer définitivement les "39h fantômes"

## Contexte du problème

### Symptôme observé
BABAY affiche 39h sur ROSEYRAN alors qu'il n'est affecté que 2 jours (Lundi + Mardi). Les 3 autres jours sont sur un autre chantier avec un autre chef.

### Cause racine identifiée
Trois fallbacks "legacy" dans le code UI autorisent TOUS les jours quand la requête `affectationsJoursChef` est vide ou pas chargée :
1. `TimeEntryTable.tsx` ligne 299
2. `Index.tsx` ligne 390-401  
3. `SignatureMacons.tsx` ligne 63-77

### Pourquoi ça se produit
La requête `useAffectationsJoursByChefAndChantier(chefId, chantierId, semaine)` retourne un tableau vide quand :
- Le `chefId` sélectionné dans l'UI ne correspond pas au chef réel des affectations
- Le `chefId` n'est pas encore chargé au premier render
- L'employé est partagé entre plusieurs chefs/chantiers

---

## Changements prévus

### 1. Sécuriser `TimeEntryTable.tsx` - Autorisation des jours

**Localisation** : `src/components/timesheet/TimeEntryTable.tsx`, fonction `isDayAuthorizedForEmployee` (lignes 283-321)

**Modification** :
```text
AVANT (ligne 299):
// Si pas d'affectations jours configurées, autoriser tout (rétrocompatibilité)
if (!affectationsJoursChef || affectationsJoursChef.length === 0) return true;

APRÈS:
// ✅ FIX: En planning actif, si pas d'affectations pour cet employé sur ce chantier = jour NON autorisé
// Cela évite les 39h fantômes
if (!affectationsJoursChef || affectationsJoursChef.length === 0) return false;
```

**Impact** : Un employé sans affectation visible sur ce chantier verra tous ses jours en "Jour non affecté" (jaune, lecture seule) au lieu d'être ouverts avec 39h.

**Garde-fou supplémentaire** : Ajouter un état de chargement pour éviter le "flash 39h" :
- Récupérer `isLoading` de `useAffectationsJoursByChefAndChantier`
- Si `isPlanningActive && isLoading` : afficher un skeleton au lieu des entrées

---

### 2. Sécuriser `Index.tsx` - Transmission des heures

**Localisation** : `src/pages/Index.tsx`, fonction `getAuthorizedDaysForEmployee` (lignes 383-406)

**Modification** :
```text
AVANT (lignes 390-401):
// Si aucune donnée d'affectation, comportement legacy (tous les jours)
if (!affectationsJoursChef || affectationsJoursChef.length === 0) {
  return days; // Retourne toutes les dates ISO
}
// Si cet employé n'a pas d'affectation spécifique, fallback legacy
if (employeeAffectations.length === 0) {
  return days;
}

APRÈS:
// ✅ FIX: En planning actif, pas de fallback à 5 jours
if (!affectationsJoursChef || affectationsJoursChef.length === 0) {
  return []; // Aucun jour autorisé → empêche transmission fantôme
}
// Si cet employé n'a pas d'affectation spécifique, 0 jour
if (employeeAffectations.length === 0) {
  return [];
}
```

**Impact** : Lors de la transmission, seuls les jours réellement affectés sont envoyés. Un employé sans affectation visible transmettra 0h au lieu de 39h.

---

### 3. Sécuriser `SignatureMacons.tsx` - Filtrage des heures à la signature

**Localisation** : `src/pages/SignatureMacons.tsx`, fonction `getFilteredMaconData` (lignes 51-92)

**Modification** :
```text
AVANT (lignes 63-77):
// Si pas d'affectations configurées, retourner tel quel (rétrocompatibilité)
if (!affectationsJoursChef || affectationsJoursChef.length === 0) {
  return macon;
}
// Si aucune affectation spécifique pour ce maçon, afficher tout
if (joursAutorises.length === 0) {
  return macon;
}

APRÈS:
// ✅ FIX: En planning actif, pas de fallback
if (!affectationsJoursChef || affectationsJoursChef.length === 0) {
  // Retourner le maçon avec fiches vides et totaux à 0
  return {
    ...macon,
    ficheJours: [],
    totalHeures: 0,
    paniers: 0,
    trajets: 0,
    intemperie: 0,
  };
}
// Si aucune affectation spécifique, afficher 0h
if (joursAutorises.length === 0) {
  return {
    ...macon,
    ficheJours: [],
    totalHeures: 0,
    paniers: 0,
    trajets: 0,
    intemperie: 0,
  };
}
```

**Impact** : À l'écran de signature, un employé sans affectation visible affiche 0h au lieu de 39h.

---

### 4. Filtrer les employés par chef dans `useMaconsByChantier.ts`

**Localisation** : `src/hooks/useMaconsByChantier.ts`, lignes 192-210

**Modification** :
```text
AVANT (lignes 194-199):
const { data: joursAffectations, error: joursError } = await supabase
  .from("affectations_jours_chef")
  .select("macon_id")
  .eq("chantier_id", chantierId)
  .eq("semaine", semaine)
  .eq("entreprise_id", entrepriseId);

APRÈS:
let query = supabase
  .from("affectations_jours_chef")
  .select("macon_id")
  .eq("chantier_id", chantierId)
  .eq("semaine", semaine)
  .eq("entreprise_id", entrepriseId);

// ✅ FIX: Filtrer par chef si fourni pour éviter d'afficher les employés d'un autre chef
if (chefId) {
  query = query.eq("chef_id", chefId);
}

const { data: joursAffectations, error: joursError } = await query;
```

**Impact** : La liste des employés d'un chantier ne contient que ceux affectés au chef sélectionné. Un employé partagé avec un autre chef n'apparaîtra pas dans cette vue.

---

## Analyse des risques de régression

### Pages impactées et leur comportement attendu

| Page/Composant | Mode Legacy (planning non validé) | Mode Planning (planning validé) |
|----------------|-----------------------------------|--------------------------------|
| **Saisie hebdo** (`Index.tsx`) | Tous les jours éditables, 39h par défaut ✅ Inchangé | Seuls les jours affectés éditables, total = somme des jours ✅ Corrigé |
| **TimeEntryTable** | Tous les jours éditables ✅ Inchangé | Jours non affectés = jaune + lecture seule ✅ Corrigé |
| **Signatures** (`SignatureMacons.tsx`) | Total = tous les jours ✅ Inchangé | Total = jours affectés uniquement ✅ Corrigé |
| **ChefMaconsManager** | N/A - toujours disponible ✅ Inchangé | N/A - toujours disponible ✅ Inchangé |
| **FinisseursDispatchWeekly** | Utilisé par conducteurs, pas affecté ✅ Inchangé | Utilisé par conducteurs, pas affecté ✅ Inchangé |
| **ValidationConducteur** | Affiche les fiches transmises ✅ Inchangé | Affiche les fiches transmises ✅ Inchangé |
| **ConsultationRH** | Lecture seule ✅ Inchangé | Lecture seule ✅ Inchangé |

### Cas spéciaux vérifiés

1. **Chef lui-même** : Toujours autorisé sur tous les jours (ligne 290 de `TimeEntryTable.tsx` conservée)
2. **Mode conducteur** : Utilise `affectationsJours` (props), pas affecté par ce changement
3. **Mode edit** : Autorise tout (ligne 296 conservée)
4. **Entreprises sans planning validé** : Retombent sur le mode legacy, comportement inchangé

### Garanties de non-régression

| Scénario | Avant | Après | Risque |
|----------|-------|-------|--------|
| Planning NON validé | Tous les jours = 39h | Tous les jours = 39h | ✅ Aucun |
| Planning validé, affectations OK | Jours filtrés correctement | Jours filtrés correctement | ✅ Aucun |
| Planning validé, chef mismatch | Fallback 39h (BUG) | 0h affiché (CORRIGÉ) | ✅ Amélioration |
| Planning validé, loading | Flash 39h possible | Skeleton affiché | ✅ Amélioration |
| Chef lui-même | Tous les jours autorisés | Tous les jours autorisés | ✅ Aucun |
| Mode conducteur/finisseur | Affectations via props | Affectations via props | ✅ Aucun |
| Mode RH edit | Tous les jours autorisés | Tous les jours autorisés | ✅ Aucun |

---

## Fichiers modifiés

1. `src/components/timesheet/TimeEntryTable.tsx`
   - Modifier `isDayAuthorizedForEmployee` (ligne 299)
   - Ajouter gestion du loading state

2. `src/pages/Index.tsx`
   - Modifier `getAuthorizedDaysForEmployee` (lignes 390-401)

3. `src/pages/SignatureMacons.tsx`
   - Modifier `getFilteredMaconData` (lignes 63-77)

4. `src/hooks/useMaconsByChantier.ts`
   - Ajouter filtre `.eq("chef_id", chefId)` (ligne 194-199)

---

## Plan de test

### Scénario principal (repro du bug BABAY)
1. SDER, Semaine 2026-S07
2. BABAY affecté : ROSEYRAN (L+M) + ROMANCHES (M+J+V)
3. Ouvrir "Saisie hebdomadaire" sur ROSEYRAN
4. **Vérifier** : BABAY affiche ~16h (pas 39h), jours M/J/V en jaune "Jour non affecté"

### Scénario mode legacy
1. Choisir une semaine SANS planning validé
2. Ouvrir "Saisie hebdomadaire"
3. **Vérifier** : Tous les jours éditables, 39h par défaut

### Scénario chef lui-même
1. Chef ouvre sa propre saisie
2. **Vérifier** : Tous ses jours sont éditables (pas bloqués)

### Scénario transmission
1. Cliquer "Transmettre / Signer"
2. **Vérifier** : `employeesData` n'inclut que les jours affectés (pas 5/5)

### Scénario signature
1. Ouvrir l'écran de signature
2. **Vérifier** : Récap heures = somme des jours affectés (pas 39h)
