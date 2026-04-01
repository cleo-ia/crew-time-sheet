

## Ajouter un onglet "Consolidé" au dashboard inventaire conducteur

### Objectif

Ajouter un système d'onglets en haut de la vue inventaire conducteur : "Par chantier" (vue actuelle) et "Consolidé" (nouvelle vue qui agrège tous les articles de tous les chantiers transmis en une seule liste).

### Changements

**`src/components/conducteur/InventoryDashboard.tsx`**
- Ajouter un état `activeTab` ("chantiers" | "consolide")
- Envelopper le contenu dans un composant `Tabs` (shadcn)
- Onglet "Par chantier" : contenu actuel inchangé
- Onglet "Consolidé" : nouveau composant inline ou extrait

**Nouveau composant ou section "Consolidé"**
- Charger tous les reports transmis via `useInventoryReportsAll()`
- Pour chaque report transmis, charger les items → nécessite un nouveau hook `useInventoryItemsAll` qui récupère tous les `inventory_items` des reports transmis en une seule requête
- Afficher groupé par chantier (nom + code), puis par catégorie, avec chaque article et sa quantité
- Inclure les photos cliquables (réutiliser la même logique que `InventoryReportDetail`)
- Badge "Transmis" / "Brouillon" / "Aucun" visible par chantier

**`src/hooks/useInventoryItems.ts`**
- Ajouter `useInventoryItemsByReportIds(reportIds: string[])` : une requête `inventory_items` filtrée par `.in("report_id", reportIds)` pour charger tous les items en une seule requête

### Résultat visuel

```text
[ Par chantier ]  [ Consolidé ]

── Vue Consolidé ──

▸ CX2CB 2CB-Atelier                    ✅ Transmis
  ── EPI ──
    Masque FFP3 (Boîte)                Qté: 14
    Gants nitrile (Boîte)              Qté: 8
  ── Outillage ──
    Marteau (U)                        Qté: 3

▸ CU847 AMBERIEU                       ⚪ Aucun

▸ CI875 BECHEVELIN                     ✅ Transmis
  ── EPI ──
    ...
```

### Risque
Aucun — ajout d'une vue lecture seule, pas de modification de données.

