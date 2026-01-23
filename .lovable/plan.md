

# Plan de correction : Alignement du flux Conducteur sur le flux Chef

## Diagnostic du problème

Le flux **Conducteur/Finisseurs** crée des fiches **en doublon** car :

1. **`sync-planning-to-teams`** crée une fiche AVEC `chantier_id` (correct)
2. **`ValidationConducteur.handleSaveAndSign()`** appelle `useSaveFiche` avec `chantierId: null`
3. **`useSaveFiche`** cherche `WHERE chantier_id IS NULL`, ne trouve rien, et **crée une nouvelle fiche**

**Résultat en base** : 2 fiches pour DARCOURT S05
- Fiche 1 : `chantier_id = da638cc1...`, `code_chantier_du_jour = NULL`, `code_trajet = NULL`  
- Fiche 2 : `chantier_id = NULL`, `code_chantier_du_jour = CI001`, `code_trajet = A_COMPLETER`

Les deux sont ensuite additionnées par le RH consolidé → 78h au lieu de 39h.

---

## Solution

Le conducteur doit **utiliser la fiche existante** (créée par le sync) plutôt que d'en créer une nouvelle.

### Stratégie

Quand le conducteur sauvegarde/signe, on doit :
1. **Récupérer la fiche existante** pour chaque employé (créée par sync, AVEC chantier)
2. **La mettre à jour** avec les données saisies (code_trajet, code_chantier_du_jour, etc.)
3. **Ne pas créer de nouvelles fiches**

---

## Fichiers à modifier

### 1. `src/pages/ValidationConducteur.tsx` (lignes 341-347)

**Problème** : `chantierId: null` force la création d'une fiche sans chantier

**Solution** : Pour chaque finisseur, récupérer le `chantier_id` depuis ses affectations

```typescript
// AVANT (ligne 341-345)
await saveFiche.mutateAsync({
  semaine: selectedWeek,
  chantierId: null,  // ❌ Toujours null
  employeesData,
  statut: "BROUILLON",
  userId: effectiveConducteurId,
});

// APRÈS
// Grouper les employés par chantier
const employeesByChantier = new Map<string | null, EmployeeData[]>();

for (const entry of employeesData) {
  // Récupérer le chantier_id depuis les affectations de cet employé
  const employeeAffectations = affectationsJours?.filter(
    aff => aff.finisseur_id === entry.employeeId
  );
  const chantierId = employeeAffectations?.[0]?.chantier_id || null;
  
  if (!employeesByChantier.has(chantierId)) {
    employeesByChantier.set(chantierId, []);
  }
  employeesByChantier.get(chantierId)!.push(entry);
}

// Sauvegarder par groupe de chantier
for (const [chantierId, employees] of employeesByChantier) {
  await saveFiche.mutateAsync({
    semaine: selectedWeek,
    chantierId,  // ✅ Chantier correct depuis affectations
    employeesData: employees,
    statut: "BROUILLON",
    userId: effectiveConducteurId,
  });
}
```

---

### 2. `src/hooks/useFinisseursByConducteur.ts` (lignes 92-102)

**Problème** : Le hook récupère la première fiche trouvée sans garantir que c'est la bonne

**Solution** : Prioriser les fiches AVEC chantier (celles créées par le sync)

```typescript
// AVANT (ligne 92-102)
const query = supabase
  .from("fiches")
  .select("id, total_heures, chantier_id")
  .eq("semaine", semaine)
  .eq("salarie_id", finisseur.id);

const { data: fiche } = await query
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

// APRÈS  
// Prioriser les fiches AVEC chantier (créées par sync)
const { data: fichesEmploye } = await supabase
  .from("fiches")
  .select("id, total_heures, chantier_id")
  .eq("semaine", semaine)
  .eq("salarie_id", finisseur.id)
  .order("chantier_id", { ascending: false, nullsFirst: false }) // Chantier non-null en premier
  .order("created_at", { ascending: false });

// Utiliser la première fiche (avec chantier si elle existe)
const fiche = fichesEmploye?.[0] || null;
```

---

### 3. `supabase/functions/sync-planning-to-teams/index.ts` (lignes 640-650)

**Amélioration** : Initialiser `code_trajet` et `code_chantier_du_jour` dès la création

```typescript
// Ajouter les données dans fiches_jours lors de la création
{
  fiche_id: ficheId,
  date: jourDate,
  heures: heuresForDay,
  HNORM: heuresForDay,
  T: 1,  // ✅ Trajet par défaut
  code_trajet: "A_COMPLETER",  // ✅ Pour que le RH puisse compléter
  PA: true,  // ✅ Panier par défaut
  code_chantier_du_jour: chantierCode,  // ✅ Code depuis le chantier
  ville_du_jour: chantierVille,  // ✅ Ville depuis le chantier
}
```

---

## Nettoyage des données existantes

Avant de tester, supprimer les fiches en doublon :

```sql
-- Supprimer les fiches SANS chantier pour les employés qui ont AUSSI une fiche AVEC chantier
DELETE FROM fiches_jours 
WHERE fiche_id IN (
  SELECT f1.id 
  FROM fiches f1
  WHERE f1.chantier_id IS NULL
    AND EXISTS (
      SELECT 1 FROM fiches f2 
      WHERE f2.salarie_id = f1.salarie_id 
        AND f2.semaine = f1.semaine 
        AND f2.chantier_id IS NOT NULL
    )
);

DELETE FROM fiches 
WHERE chantier_id IS NULL
  AND id IN (
    SELECT f1.id 
    FROM fiches f1
    WHERE f1.chantier_id IS NULL
      AND EXISTS (
        SELECT 1 FROM fiches f2 
        WHERE f2.salarie_id = f1.salarie_id 
          AND f2.semaine = f1.semaine 
          AND f2.chantier_id IS NOT NULL
      )
  );
```

---

## Test de validation

1. Purger les données SDER
2. **Planning** : Affecter DARCOURT et KASMI au chantier TEST, S05
3. **Valider le planning** + Sync S+1
4. **Vérifier en base** : 1 seule fiche par employé/semaine AVEC `chantier_id`
5. **Espace Conducteur → Mes heures** : Vérifier que les données sont chargées depuis la fiche existante
6. **Collecter les signatures** → Signer
7. **Consultation RH → Consolidé** :
   - 39h (pas 78h)
   - Trajets = 5
   - Chantier = CI001

---

## Résumé technique

| Fichier | Modification |
|---------|--------------|
| `ValidationConducteur.tsx` | Grouper par chantier et passer le bon `chantierId` |
| `useFinisseursByConducteur.ts` | Prioriser les fiches AVEC chantier |
| `sync-planning-to-teams/index.ts` | Initialiser `code_trajet`, `code_chantier_du_jour` dès la création |

