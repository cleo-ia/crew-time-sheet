

## Retirer l'onglet Consolidé et ajouter un bouton "Récap global"

### Objectif

Retirer les onglets "Par chantier / Consolidé" du dashboard inventaire. Ajouter un gros bouton bien visible entre le header "Inventaires" et la liste des chantiers. Ce bouton ouvre un Sheet/Dialog avec une vue consolidée : totaux de quantité par matériel, agrégés tous chantiers confondus.

### Changements (1 fichier)

**`src/components/conducteur/InventoryDashboard.tsx`**

1. **Retirer le système `Tabs`** — supprimer `TabsList`, `TabsTrigger`, `TabsContent`, revenir à la liste de chantiers directement
2. **Ajouter un gros bouton** entre le header et la liste, style `bg-primary text-white` pleine largeur avec icône Package, texte "Récap global inventaires"
3. **Ajouter un état `showConsolide`** (`useState<boolean>(false)`)
4. **Ajouter un Sheet** qui s'ouvre au clic sur le bouton, contenant la vue consolidée :
   - Agréger tous les `inventory_items` de tous les reports transmis
   - Grouper par **catégorie** puis par **désignation + unité**
   - Pour chaque matériel : afficher le **total cumulé** de `quantity_good` tous chantiers confondus
   - Afficher aussi le détail par chantier en sous-ligne (quel chantier a quelle quantité)
   - Photos cliquables en plein écran (réutiliser la logique existante)

### Résultat visuel

```text
  Inventaires                      [Paramétrer]

  ┌──────────────────────────────────────────┐
  │  📦  Récap global inventaires            │
  └──────────────────────────────────────────┘

  [ Liste des chantiers actifs ... ]
```

Au clic sur le bouton → Sheet latéral :

```text
  Récap global inventaires
  ─────────────────────────
  ── EPI ──
    Masque FFP3 (Boîte)          Total: 47
      • 2CB-Atelier: 14
      • BECHEVELIN: 33
    Gants nitrile (Boîte)        Total: 22
      • 2CB-Atelier: 8
      • AMBERIEU: 14
  ── Outillage ──
    Marteau (U)                  Total: 7
      ...
```

### Risque
Aucun — vue lecture seule, données déjà chargées via le hook existant `useInventoryItemsByReportIds`.

