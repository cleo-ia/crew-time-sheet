

# Plan : Page dediee Export Paie (`/export-paie`)

## Objectif

Creer une page `/export-paie` dediee a Tanguy (role `rh`) et aux `admin`/`super_admin`, avec un workflow lineaire et epure pour l'export de paie. Cette page ne remplace pas `ConsultationRH` -- elle extrait les fonctionnalites d'export/cloture dans un environnement dedie et securise.

## Ce qui sera construit

### 1. Nouvelle page `src/pages/ExportPaie.tsx`

Page avec workflow en etapes visuelles :
- **Etape 1 -- Selection periode** : selecteur de mois (identique a RHFilters mais simplifie, juste le mois)
- **Etape 2 -- Recap** : resume consolide de la periode (nb salaries, heures, absences, paniers, trajets, warnings). Reutilise `buildRHConsolidation`.
- **Etape 3 -- Pre-export** : tableau editable identique a `RHPreExport` (absences, trajets, heures supp). Permet les ajustements finaux.
- **Etape 4 -- Export & Cloture** : boutons d'export (Excel complet, Chefs 2CB, Interimaires, Ventilation PDF) + bouton cloture avec confirmation.

Le tout dans une interface etape par etape (stepper ou tabs lineaires), pas un dashboard multi-onglets.

### 2. Route et securite

- Route : `/export-paie`
- Roles autorises : `super_admin`, `admin`, `rh`
- Ajout dans `App.tsx` avec `RequireRole`
- Ajout du lien dans `AppNav.tsx` pour les roles concernes

### 3. Reutilisation du code existant

Aucune duplication -- la page importe directement :
- `buildRHConsolidation` et `fetchRHExportData` (hooks existants)
- `RHPreExport` (composant existant, passe en props `filters`)
- `generateRHExcel` (lib existante)
- `ClotureDialog` (composant existant)
- `InterimaireExportDialog` (composant existant)
- `exportVentilationCompletePdf` (lib existante)

### 4. Navigation

- Lien "Export Paie" visible dans `AppNav` pour `rh`, `admin`, `super_admin`
- Icone : `FileOutput` ou `Send` (lucide)
- Theme : `consultation-rh` (reutilise le meme theme couleur)

## Structure technique

```text
/export-paie
+------------------------------------------------------+
| PageHeader: "Export de paie"                         |
+------------------------------------------------------+
| [Selecteur mois]                                     |
+------------------------------------------------------+
| Stepper: 1.Recap > 2.Ajustements > 3.Export&Cloture  |
|                                                       |
| Etape 1: Cards recap (salaries, heures, warnings)    |
| Etape 2: <RHPreExport filters={...} />               |
| Etape 3: Boutons export + <ClotureDialog />          |
+------------------------------------------------------+
```

## Fichiers touches

| Fichier | Action |
|---|---|
| `src/pages/ExportPaie.tsx` | Creer |
| `src/App.tsx` | Ajouter route `/export-paie` avec RequireRole |
| `src/components/navigation/AppNav.tsx` | Ajouter lien nav pour rh/admin/super_admin |

