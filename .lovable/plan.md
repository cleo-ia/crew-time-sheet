
# Plan : Empêcher la sauvegarde des véhicules incomplets

## Analyse de régression complète

J'ai analysé exhaustivement tous les composants et hooks qui utilisent les fiches de trajet. Voici la garantie :

### Aucune régression sur :

| Fonctionnalité | Raison |
|----------------|--------|
| **Affichage UI** | `TransportSheetV2` et `TransportDayAccordion` comptent déjà uniquement les véhicules complets (3 champs remplis) pour afficher "X véhicules complets" |
| **Validation signature** | `useTransportValidation` vérifie déjà que chaque jour a au moins 1 véhicule avec `immatriculation && conducteurMatinId && conducteurSoirId` |
| **Vues RH** | `useTransportByChantierUnified` et `useConducteurHistorique` lisent simplement toutes les entrées existantes - les données complètes seront toujours là |
| **Validation conducteur** | `ValidationConducteur` vérifie la présence de paires MATIN+SOIR avec immat ET conducteur - notre logique génère toujours ces paires pour les véhicules complets |
| **Copie semaine précédente** | `useCopyPreviousWeekTransport` copie les véhicules existants - seuls les complets seront en base, donc seuls les complets seront copiés |

### Ce qui change :

1. **Plus d'entrées fantômes** : Un véhicule partiellement rempli (ex: juste l'immatriculation) reste dans l'interface locale mais n'est PAS sauvegardé en base
2. **Blocage cross-chantier corrigé** : `VehiculeCombobox` ne bloquera plus un véhicule qui n'a jamais été réellement assigné

---

## Modifications techniques

### 1. `src/hooks/useAutoSaveTransportV2.ts`

**Modification de `hasValidData` (lignes 19-28)**
```typescript
// AVANT : sauvegarde dès qu'un seul champ est rempli
const hasValidData = days.some(day => 
  day.vehicules.some(v => 
    v.immatriculation || 
    v.conducteurMatinId || 
    v.conducteurSoirId ||
    v.conducteurMatinNom ||
    v.conducteurSoirNom
  )
);

// APRÈS : sauvegarde uniquement si véhicule complet
const hasValidData = days.some(day => 
  day.vehicules.some(v => 
    v.immatriculation && v.conducteurMatinId && v.conducteurSoirId
  )
);
```

**Modification de l'insertion (lignes 113-136)**
```typescript
// AVANT : insertion si conducteur OU immat
if (vehicule.conducteurMatinId || vehicule.immatriculation) {
  jourEntries.push({ ... MATIN ... });
}
if (vehicule.conducteurSoirId || vehicule.immatriculation) {
  jourEntries.push({ ... SOIR ... });
}

// APRÈS : insertion uniquement si véhicule complet (3 champs)
if (vehicule.immatriculation && vehicule.conducteurMatinId && vehicule.conducteurSoirId) {
  jourEntries.push({
    fiche_transport_id: transportId,
    date: day.date,
    periode: "MATIN",
    conducteur_aller_id: vehicule.conducteurMatinId,
    conducteur_retour_id: null,
    immatriculation: vehicule.immatriculation,
  });
  jourEntries.push({
    fiche_transport_id: transportId,
    date: day.date,
    periode: "SOIR",
    conducteur_aller_id: null,
    conducteur_retour_id: vehicule.conducteurSoirId,
    immatriculation: vehicule.immatriculation,
  });
}
```

### 2. `src/hooks/useSaveTransportV2.ts`

**Même modification pour le save manuel (lignes 95-120)**
```typescript
// APRÈS : insertion uniquement si véhicule complet
if (vehicule.immatriculation && vehicule.conducteurMatinId && vehicule.conducteurSoirId) {
  jourEntries.push({ ... MATIN ... });
  jourEntries.push({ ... SOIR ... });
}
```

---

## Comportement attendu après correction

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ÉTAT LOCAL (UI)                                   │
│                                                                     │
│  Lundi:                                                             │
│    Véhicule 1: [AD-630-SY] [Philippe] [Philippe]  ← Complet ✅      │
│    Véhicule 2: [AB-123-CD] [        ] [        ]  ← Incomplet ⚠️    │
│                                                                     │
│  Mardi:                                                             │
│    Véhicule 1: [        ] [        ] [        ]  ← Vide ⚠️          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Auto-save
┌─────────────────────────────────────────────────────────────────────┐
│                    BASE DE DONNÉES                                   │
│                                                                     │
│  Lundi MATIN:   AD-630-SY | conducteur_aller = Philippe             │
│  Lundi SOIR:    AD-630-SY | conducteur_retour = Philippe            │
│                                                                     │
│  (rien pour Véhicule 2 de Lundi - pas sauvegardé car incomplet)     │
│  (rien pour Mardi - pas sauvegardé car vide)                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Nettoyage des données fantômes existantes

Après implémentation, je proposerai une requête SQL pour supprimer les entrées existantes qui ont une immatriculation mais aucun conducteur.

---

## Résumé des garanties

| Aspect | Garanti |
|--------|---------|
| Affichage des véhicules existants | ✅ Inchangé |
| Comptage "X véhicules complets" | ✅ Inchangé (même logique) |
| Validation avant signature | ✅ Inchangé (même critère) |
| Blocage double-booking même jour | ✅ Inchangé |
| Blocage cross-chantier | ✅ Corrigé (plus de faux positifs) |
| Copie S-1 | ✅ Seuls les véhicules complets sont copiés |
| Vues RH | ✅ Lecture seule, données existantes intactes |
| Historique conducteur | ✅ Lecture seule, données existantes intactes |
| Multi-véhicules par jour | ✅ Inchangé |
| Duplication Lundi → Semaine | ✅ Inchangé |
