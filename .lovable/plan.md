

# Plan : Ajouter le Récapitulatif Trajet séparé côté Conducteur

## Résumé

Actuellement, le récapitulatif des trajets côté **Conducteur** (`SignatureFinisseurs.tsx`) est intégré dans chaque ligne de finisseur via un système "expand/collapse" par employé. Cela rend difficile la lecture globale des informations de transport.

L'objectif est d'ajouter une **section dédiée** "Récapitulatif Trajet" identique à celle affichée côté **Chef** (`SignatureMacons.tsx`), qui utilise le composant `TransportSummaryV2` dans un accordéon séparé.

---

## Analyse Comparative

### Côté Chef (actuel)
- Un **accordéon dédié** "Récapitulatif Trajet" s'affiche avant la liste des employés
- Utilise le hook `useTransportByChantier` pour récupérer les données transport
- Affiche un tableau global : Date | Code Chantier | Véhicule | Conducteur Matin | Conducteur Soir

### Côté Conducteur (actuel)
- Les données transport sont **imbriquées** dans chaque ligne d'employé
- Chargement manuel via `useEffect` → `transportFinisseursData`
- Pas de vue globale consolidée

---

## Modifications Prévues

### Fichier : `src/pages/SignatureFinisseurs.tsx`

1. **Ajouter l'import** du composant `TransportSummaryV2` et du hook de données transport
   ```typescript
   import { TransportSummaryV2 } from "@/components/transport/TransportSummaryV2";
   import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
   ```

2. **Agréger les données de transport** pour tous les chantiers concernés
   - Créer une structure `days` compatible avec `TransportSummaryV2`
   - Consolider les jours depuis `transportFinisseursData` (déjà chargé)

3. **Ajouter la section Récapitulatif Trajet**
   - Positionnée **entre** le récap heures équipe et la zone de signature
   - Format identique au côté Chef : accordéon avec icône camion

### Structure du code à ajouter

```text
┌─────────────────────────────────────────────────────┐
│   Récapitulatif heures équipe (existant)            │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│   🆕 Accordéon "Récapitulatif Trajet"               │
│   ┌─────────────────────────────────────────────┐   │
│   │  TransportSummaryV2 (tableau global)        │   │
│   │  Date | Code Chantier | Véhicule | AM | PM  │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│   Zone de signature conducteur (existant)           │
└─────────────────────────────────────────────────────┘
```

---

## Détails Techniques

### Transformation des données

Les données actuelles dans `transportFinisseursData` sont structurées par finisseur :
```typescript
{
  [finisseurId]: {
    days: [{ date, immatriculation, conducteur_matin_id, conducteur_soir_id }]
  }
}
```

Pour `TransportSummaryV2`, il faut un format consolidé :
```typescript
{
  days: [
    { date: "2025-02-03", vehicules: [{ immatriculation, conducteurMatinNom, conducteurSoirNom }] }
  ]
}
```

### Logique de consolidation

1. Parcourir tous les finisseurs et leurs jours de transport
2. Grouper par date
3. Dédupliquer les véhicules par immatriculation
4. Enrichir avec les noms de conducteurs (déjà disponibles via la requête existante)

---

## Avantages

| Aspect | Avant | Après |
|--------|-------|-------|
| Vue transport | Fragmentée par employé | Globale + détail par employé |
| Cohérence UX | Différente du Chef | Identique au Chef |
| Lisibilité | Cliquer sur chaque employé | Tableau récap visible d'un coup |

---

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/pages/SignatureFinisseurs.tsx` | Ajout section TransportSummaryV2 + agrégation données |

