
# Correction du bug de création de fiches "sans chantier"

## Problème identifié

L'auto-save (`useAutoSaveFiche.ts`) crée des fiches fantômes "sans chantier" quand l'Espace Conducteur s'ouvre avec `chantierId = null`. Ces fiches dupliquent les heures déjà saisies sur les vrais chantiers.

**Cas KASMI S05 :**
- Fiche TEST (16h) + Fiche LE ROSEYRAN (23h) = 39h ✅
- Fiche "sans chantier" (39h) créée par erreur = +39h en doublon ❌
- Total affiché en RH : 62h + 27h supp (au lieu de 39h)

## Solution en 3 étapes

### Étape 1 : Nettoyer les données KASMI (SQL one-shot)

Supprimer la fiche "sans chantier" qui cause le doublon :

```sql
-- Supprimer les fiches_jours de la fiche fantôme
DELETE FROM fiches_jours 
WHERE fiche_id = '38dde2a7-3d42-4601-af05-7114cf88fd54';

-- Supprimer la fiche fantôme elle-même
DELETE FROM fiches 
WHERE id = '38dde2a7-3d42-4601-af05-7114cf88fd54';
```

### Étape 2 : Corriger useAutoSaveFiche.ts

**Fichier** : `src/hooks/useAutoSaveFiche.ts`

**Problème actuel** (lignes 100-140) :
```typescript
if (!chantierId) {
  query = query.is("chantier_id", null);  // ← Cherche fiche sans chantier
}
// Si pas trouvée → crée une NOUVELLE fiche sans chantier
```

**Correction proposée** :
Quand `chantierId = null`, vérifier si l'employé a déjà des fiches avec chantier pour cette semaine. Si oui, NE PAS créer de fiche "sans chantier".

```typescript
if (!chantierId) {
  // Finisseurs: d'abord vérifier si l'employé a déjà des fiches AVEC chantier
  const { data: fichesAvecChantier } = await supabase
    .from("fiches")
    .select("id")
    .eq("semaine", weekId)
    .eq("salarie_id", entry.employeeId)
    .not("chantier_id", "is", null)
    .limit(1);
  
  if (fichesAvecChantier && fichesAvecChantier.length > 0) {
    // L'employé a des fiches chantier → NE PAS créer de fiche sans chantier
    console.log(`[AutoSave] Skip: ${entry.employeeName} a déjà des fiches chantier`);
    continue; // Passer à l'employé suivant
  }
  
  // Sinon, chercher/créer fiche sans chantier (comportement actuel)
  query = query.is("chantier_id", null);
}
```

### Étape 3 : Ajouter une déduplication dans buildRHConsolidation

**Fichier** : `src/hooks/rhShared.ts`

**Sécurité supplémentaire** : même si des doublons existent en base, le calcul RH doit les dédupliquer.

```typescript
// Dans buildRHConsolidation, lors de l'agrégation des jours
const joursParDate = new Map<string, FicheJour>();

for (const fiche of fichesSalarie) {
  const joursFiche = joursData?.filter(j => j.fiche_id === fiche.id) || [];
  for (const jour of joursFiche) {
    const existing = joursParDate.get(jour.date);
    // Prendre le jour de la fiche avec le meilleur statut
    const priorite = { "ENVOYE_RH": 3, "AUTO_VALIDE": 2, "BROUILLON": 1 };
    if (!existing || priorite[fiche.statut] > priorite[existing.ficheStatut]) {
      joursParDate.set(jour.date, { ...jour, ficheStatut: fiche.statut });
    }
  }
}

// Ensuite, calculer les heures uniquement sur joursParDate.values()
```

## Résultat attendu

| Vue | Avant correction | Après correction |
|-----|------------------|------------------|
| RH Consolidé | 62h + 27h supp | 39h + 4h supp |
| Détail KASMI | 3 fiches (dont 1 fantôme) | 2 fiches (TEST + ROSEYRAN) |
| Espace Conducteur | Crée des fiches fantômes | Ne crée plus de doublons |

## Fichiers impactés

1. `src/hooks/useAutoSaveFiche.ts` - Empêcher création de fiches "sans chantier" si fiches chantier existent
2. `src/hooks/rhShared.ts` - Dédupliquer les jours par date lors du calcul RH

## Prévention future

Optionnel : Ajouter un outil admin pour détecter et nettoyer les fiches "sans chantier" orphelines :

```sql
-- Trouver les fiches "sans chantier" pour des salariés qui ont aussi des fiches AVEC chantier
SELECT f1.id, f1.salarie_id, f1.semaine, f1.total_heures
FROM fiches f1
WHERE f1.chantier_id IS NULL
  AND EXISTS (
    SELECT 1 FROM fiches f2 
    WHERE f2.salarie_id = f1.salarie_id 
      AND f2.semaine = f1.semaine 
      AND f2.chantier_id IS NOT NULL
  );
```
