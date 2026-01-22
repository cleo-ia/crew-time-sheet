
# Plan de correction : Retirer les fiches BROUILLON du RH

## Problème

J'ai fait une erreur en ajoutant du code pour inclure les fiches `BROUILLON` des chantiers sans chef dans les données RH. C'est **incorrect** car :

- Le flux est clair : **BROUILLON → VALIDE_CHEF → ENVOYE_RH** (avec chef) ou **BROUILLON → ENVOYE_RH** (sans chef, conducteur signe directement)
- Les fiches BROUILLON ne doivent **JAMAIS** apparaître côté RH
- Le conducteur peut et doit signer les fiches des chantiers sans chef pour les transmettre au RH

## Action corrective

### Modification de `src/hooks/rhShared.ts`

Supprimer le bloc de code aux lignes 280-303 qui récupère les fiches BROUILLON :

**À supprimer :**
```typescript
// Récupérer les fiches BROUILLON des chantiers sans chef (non transmissibles mais à inclure)
let fichesChantiersSansChef: typeof fichesAvecChantier = [];
if (entrepriseId) {
  const { data: fichesSansChef } = await supabase
    .from("fiches")
    .select(`...`)
    .is("chantiers.chef_id", null)
    .eq("statut", "BROUILLON")
    .eq("chantiers.entreprise_id", entrepriseId);

  if (fichesSansChef) {
    fichesChantiersSansChef = fichesSansChef;
  }
}
```

**Ligne 303 - Retirer la fusion avec `fichesChantiersSansChef` :**
```typescript
// AVANT
const toutesLesFiches = [...(fichesAvecChantier || []), ...(fichesFinisseurs || []), ...fichesChantiersSansChef];

// APRÈS
const toutesLesFiches = [...(fichesAvecChantier || []), ...(fichesFinisseurs || [])];
```

## Ce qui reste valide

Les autres corrections du plan précédent sont toujours correctes :
- ✅ Le trigger `tr_fiches_jours_set_entreprise` pour auto-peupler `entreprise_id`
- ✅ La correction de `sync-planning-to-teams` avec gestion d'erreurs
- ✅ La restauration des données KASMI (16h pour le chantier TEST)

## Résultat attendu

| État | Comportement |
|------|--------------|
| Fiche BROUILLON (chantier sans chef) | **Non visible** côté RH - le conducteur doit la signer |
| Fiche ENVOYE_RH | **Visible** côté RH normalement |
| Données KASMI S05 | **39h au total** (après signature par le conducteur du chantier TEST) |

## Fichier impacté

- `src/hooks/rhShared.ts` : Supprimer les lignes 280-303 et modifier la ligne de fusion
