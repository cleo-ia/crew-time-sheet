

# Plan de nettoyage final : Migration complète vers le nouveau système de transport conducteur

## Analyse de régression

Après analyse approfondie du code, **il y aura régression** si nous ne corrigeons pas les 2 fichiers critiques qui lisent encore depuis l'ancien système :

| Fichier | Impact sans correction |
|---------|------------------------|
| `SignatureFinisseurs.tsx` | Le récapitulatif des véhicules sera **VIDE** avant signature |
| `useConducteurHistorique.ts` | L'historique des trajets sera **VIDE** pour les nouvelles semaines |

---

## Modifications requises

### 1. SignatureFinisseurs.tsx (Critique)

**Problème** : Lignes 121-166 chargent les données depuis `fiches_transport_finisseurs` (ancien système).

**Solution** : Charger depuis `fiches_transport` + `fiches_transport_jours` (nouveau système unifié).

```text
Avant (code actuel):
┌─────────────────────────────────────────────────┐
│ finisseur → fiches_transport_finisseurs         │
│           → fiches_transport_finisseurs_jours   │
└─────────────────────────────────────────────────┘

Après (nouveau flux):
┌─────────────────────────────────────────────────┐
│ chantier + semaine → fiches_transport           │
│                    → fiches_transport_jours     │
│ (unifié pour toute l'équipe)                    │
└─────────────────────────────────────────────────┘
```

**Logique** :
- Récupérer tous les chantier_ids depuis les affectations des finisseurs
- Pour chaque chantier, charger la fiche transport unifiée
- Mapper les jours de transport aux finisseurs via leurs dates d'affectation

---

### 2. useConducteurHistorique.ts (Critique)

**Problème** : Lignes 199-311 chargent les jours de transport depuis `fiches_transport_finisseurs_jours`.

**Solution** : Charger depuis `fiches_transport_jours` via le chantier_id de la fiche.

**Logique** :
- Récupérer le `chantier_id` depuis la fiche
- Chercher `fiches_transport` par `chantier_id` + `semaine`
- Charger `fiches_transport_jours` avec les conducteurs

---

### 3. VehiculeCombobox.tsx (Mineur - nettoyage)

**Problème** : Double vérification contre les deux systèmes (lignes 54-87 et 125-157).

**Solution** : Supprimer les queries vers `fiches_transport_finisseurs_jours`.

Les véhicules seront vérifiés uniquement contre `fiches_transport_jours`, ce qui est correct puisque c'est la seule table où les nouvelles données sont écrites.

---

### 4. useTransportByChantierUnified.ts (Nettoyage optionnel)

**Problème** : Le fallback `fetchFromFichesTransportFinisseurs` (lignes 145-249) n'est plus nécessaire.

**Solution** : Supprimer le fallback car :
- Les nouvelles données conducteur sont écrites dans `fiches_transport`
- Les anciennes données historiques resteront dans l'ancienne table mais ne seront plus lues

---

## Fichiers à conserver intacts (purge des anciennes données)

Ces fichiers doivent continuer à référencer les anciennes tables car elles contiennent des données historiques :

| Fichier | Raison |
|---------|--------|
| `FinisseursDispatchWeekly.tsx` | Nettoie les anciennes données lors de la suppression d'un finisseur |
| `usePurgeTestData.ts` | Purge de test |
| `supabase/functions/purge-*` | Nettoyage des anciennes semaines |

---

## Résultat attendu après migration

| Fonctionnalité | Avant | Après |
|----------------|-------|-------|
| Récap transport avant signature | ❌ Vide | ✅ Données unifiées visibles |
| Historique conducteur | ❌ Vide pour nouvelles semaines | ✅ Trajets affichés correctement |
| Vérification véhicules disponibles | ⚠️ Double vérification (redondante) | ✅ Vérification unique, plus rapide |
| Vue RH transport | ✅ OK (via fallback) | ✅ OK (sans fallback) |

---

## Ordre d'implémentation

1. **SignatureFinisseurs.tsx** - Migrer le chargement des données transport (priorité haute)
2. **useConducteurHistorique.ts** - Migrer vers le nouveau système (priorité haute)
3. **VehiculeCombobox.tsx** - Supprimer les queries obsolètes (priorité moyenne)
4. **useTransportByChantierUnified.ts** - Supprimer le fallback (priorité basse)

---

## Garantie de non-régression

Après ces modifications :
- ✅ Les conducteurs voient le récap transport complet avant signature
- ✅ L'historique affiche les trajets correctement
- ✅ La vérification des véhicules est plus simple et plus rapide
- ✅ Aucune donnée existante n'est perdue (les Edge Functions de purge nettoient les anciennes tables)
- ✅ Le flux de transmission RH continue de fonctionner via `fiches_transport`

