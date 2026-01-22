

# Plan de correction : Affichage des cartes "Détail chantier/semaine" pour les équipes sans chef

## Contexte

Après le test du flux complet pour un chantier sans chef (TEST) :
- Les données arrivent correctement côté RH avec les bonnes heures (24h pour KASMI, 39h pour DARCOURT)
- Mais l'onglet "Détail chantier/semaine" affiche "Aucune fiche à afficher"
- Le chantier TEST devrait avoir une carte dans cet onglet

## Cause racine

Dans `src/pages/SignatureFinisseurs.tsx` (lignes 232-238), lors de la transmission :

```typescript
const { error: updateError } = await supabase
  .from("fiches")
  .update({ statut: "ENVOYE_RH" })
  .eq("semaine", semaine)
  .in("salarie_id", finisseurIds)
  .is("chantier_id", null);  // ← PROBLÈME ICI
```

La condition `.is("chantier_id", null)` filtre uniquement les fiches sans chantier associé. Or, pour les équipes sans chef :
- Les fiches ONT un `chantier_id` (ex: TEST = `da638cc1-...`)
- Le chantier n'a pas de chef (`chef_id = NULL`)
- Le conducteur gère directement cette équipe

Ces fiches restent donc en statut `BROUILLON` et n'apparaissent pas dans la vue RH.

## Données actuelles en base

| Fiche | Salarié | Chantier | chef_id | Statut |
|-------|---------|----------|---------|--------|
| `191e4a7a-...` | DARCOURT | TEST | NULL | BROUILLON |
| `2f0ee8cb-...` | KASMI | TEST | NULL | BROUILLON |

## Solution proposée

### Modification : SignatureFinisseurs.tsx

Remplacer la logique de mise à jour du statut pour gérer les deux cas :

**Cas 1** : Fiches "finisseurs purs" (sans chantier) → `chantier_id IS NULL`
**Cas 2** : Fiches d'équipes sans chef → `chantier_id` renseigné mais `chef_id IS NULL`

```text
// Nouvelle logique (lignes 229-250)

1. Récupérer les IDs des chantiers sans chef gérés par ce conducteur
2. Mettre à jour les fiches finisseurs purs (chantier_id = null) → ENVOYE_RH  
3. Mettre à jour les fiches des équipes sans chef (chantier.chef_id = null) → ENVOYE_RH
```

### Implémentation technique

```typescript
// 2a. Fiches "finisseurs purs" (sans chantier)
if (finisseurIds.length > 0) {
  await supabase
    .from("fiches")
    .update({ statut: "ENVOYE_RH" })
    .eq("semaine", semaine)
    .in("salarie_id", finisseurIds)
    .is("chantier_id", null);
}

// 2b. Fiches d'équipes sur chantiers SANS CHEF gérées par ce conducteur
// Récupérer les chantiers sans chef de ce conducteur
const { data: chantiersWithoutChef } = await supabase
  .from("chantiers")
  .select("id")
  .eq("conducteur_id", conducteurId)
  .is("chef_id", null);

if (chantiersWithoutChef && chantiersWithoutChef.length > 0) {
  const chantierIds = chantiersWithoutChef.map(c => c.id);
  
  await supabase
    .from("fiches")
    .update({ statut: "ENVOYE_RH" })
    .eq("semaine", semaine)
    .in("salarie_id", finisseurIds)
    .in("chantier_id", chantierIds);
}
```

## Modification UI (optionnelle mais recommandée)

Dans `src/components/rh/RHDetailView.tsx`, adapter l'affichage du chef :

```text
Ligne 47 : <span>Chef: {fiche.chef}</span>

Si le champ chef est vide, afficher plutôt :
<span>Conducteur direct</span> ou <span>Sans chef</span>
```

## Impact

| Composant | Avant | Après |
|-----------|-------|-------|
| SignatureFinisseurs | Ne met à jour que les fiches sans chantier | Met à jour aussi les fiches des chantiers sans chef |
| RHDetailView | Carte vide pour les équipes sans chef | Affiche "Conducteur direct" ou le nom du conducteur |
| Détail chantier/semaine | "Aucune fiche" pour TEST | Carte visible pour TEST |

## Étapes de validation

1. Implémenter la correction dans SignatureFinisseurs.tsx
2. Corriger manuellement le statut des fiches existantes (BROUILLON → ENVOYE_RH)
3. Vérifier que la carte TEST apparaît dans "Détail chantier/semaine"
4. (Optionnel) Purger et refaire un test complet du flux

## Risques et mitigations

**Rétro-compatibilité** : La nouvelle logique ajoute un cas supplémentaire sans modifier l'existant pour les fiches `chantier_id = NULL`.

**Performance** : Une requête supplémentaire pour récupérer les chantiers sans chef (négligeable).

