

## Passer l'inventaire en "one-shot" (un seul par chantier)

### Contexte

Actuellement le système crée un rapport par chantier **par mois** (`mois` = "yyyy-MM"). L'utilisateur veut un seul inventaire par chantier, sans notion mensuelle.

### Changements

**1. Hook `useInventoryReports.ts`**
- `useInventoryReport(chantierId)` : retirer le filtre `.eq("mois", mois)`, chercher simplement le rapport du chantier (le dernier ou unique)
- Supprimer `useInventoryReportPreviousMonth` (plus de mois-1)
- `useCreateInventoryReport` : passer un mois fixe genre `"UNIQUE"` ou la date du jour (peu importe, le champ existe en base)
- `useInventoryReportsAll` : inchangé

**2. Composant `ChantierInventaireTab.tsx`**
- Retirer `currentMois`, `previousMois`, `subMonths`, `previousReport`, `previousItems`, `previousTotalsMap`
- Retirer le bouton "Copier mois-1"
- Retirer `previous_total` du `LocalItem`
- Simplifier l'en-tête : "Inventaire" au lieu de "Inventaire — 2026-04"
- Le query `useInventoryReport(chantierId)` sans mois

**3. Composant `InventoryDashboard.tsx`**
- Retirer le filtre `currentMois` sur les rapports
- Afficher simplement le statut du rapport unique de chaque chantier
- En-tête : "Inventaires" au lieu de "Inventaires — 2026-04"

**4. Composant `InventoryReportDetail.tsx`**
- Retirer la référence au mois dans l'affichage si elle existe

**5. Hook `useInventoryItems.ts`** et `InventoryItemRow.tsx`
- Retirer `previous_total` / `previousTotal` des props si utilisé

### Ce qui ne change PAS
- La table `inventory_reports` en base (la colonne `mois` reste, on mettra une valeur fixe)
- Pas de migration SQL nécessaire
- Le flux saisie → brouillon → signature → transmis reste identique
- Les photos, templates, le paramétrage : inchangés

### Risque

Faible — on simplifie en retirant de la logique. Si plus tard on veut revenir au mensuel, on réactivera le filtre `mois`.

