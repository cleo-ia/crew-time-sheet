# Migration terminée : Système de transport conducteur unifié

## ✅ Modifications effectuées

### 1. SignatureFinisseurs.tsx ✅
- Migré le chargement des données transport depuis `fiches_transport` + `fiches_transport_jours` (système unifié)
- Supprimé les requêtes vers `fiches_transport_finisseurs` et `fiches_transport_finisseurs_jours`

### 2. useConducteurHistorique.ts ✅
- Migré vers `fiches_transport` + `fiches_transport_jours` via `chantier_id`
- Supprimé les requêtes vers `fiches_transport_finisseurs` et `fiches_transport_finisseurs_jours`

### 3. VehiculeCombobox.tsx ✅
- Supprimé la double vérification (ancienne query `usedVehicules` vers `fiches_transport_finisseurs_jours`)
- Simplifié en une seule query vers `fiches_transport_jours`

### 4. useTransportByChantierUnified.ts ✅
- Supprimé le fallback `fetchFromFichesTransportFinisseurs`
- Simplifié le hook pour lire uniquement depuis `fiches_transport`

---

## Fichiers conservés pour la purge historique

Ces fichiers continuent de référencer les anciennes tables pour nettoyer les données existantes :

| Fichier | Raison |
|---------|--------|
| `FinisseursDispatchWeekly.tsx` | Nettoie les anciennes données lors de la suppression d'un finisseur |
| `usePurgeTestData.ts` | Purge de test |
| `supabase/functions/purge-*` | Nettoyage des anciennes semaines |

---

## Résultat final

| Fonctionnalité | Statut |
|----------------|--------|
| Récap transport avant signature | ✅ Données unifiées visibles |
| Historique conducteur | ✅ Trajets affichés correctement |
| Vérification véhicules disponibles | ✅ Vérification unique, plus rapide |
| Vue RH transport | ✅ OK via système unifié |

---

## Aucune régression

- ✅ Les conducteurs voient le récap transport complet avant signature
- ✅ L'historique affiche les trajets correctement
- ✅ La vérification des véhicules est simplifiée
- ✅ Les Edge Functions de purge nettoient les anciennes tables
- ✅ Le flux de transmission RH fonctionne via `fiches_transport`
