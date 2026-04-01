

## Module Inventaire Chantier Mensuel — Plan d'implémentation

### Phase 1 — Migration SQL (3 tables + bucket + trigger)

**Fichier** : `supabase/migrations/20260401_inventory_tables.sql`

```text
inventory_templates
├── id, entreprise_id, categorie, designation, unite ('U'), ordre, created_by, created_at, updated_at
├── RLS: entreprise_id = get_selected_entreprise_id()
├── Trigger: set_entreprise_id (copie du pattern existant)

inventory_reports  
├── id, entreprise_id, chantier_id, mois ('2026-04'), statut ('BROUILLON'|'TRANSMIS')
├── created_by, signature_data, transmitted_at, created_at, updated_at
├── UNIQUE(chantier_id, mois) — 1 inventaire/chantier/mois
├── RLS: entreprise_id = get_selected_entreprise_id()
├── Trigger: set_entreprise_from_chantier (pattern existant réutilisé)

inventory_items
├── id, entreprise_id, report_id, template_id (nullable), categorie, designation, unite
├── quantity_good (0), quantity_repair (0), quantity_broken (0)
├── total (generated always as quantity_good + quantity_repair + quantity_broken)
├── previous_total (nullable), photos (text[] default '{}')
├── created_at, updated_at
├── RLS: entreprise_id = get_selected_entreprise_id()
```

Storage : bucket `inventory-photos` (public, RLS authenticated).

---

### Phase 2 — Feature flag

**`src/config/enterprises/types.ts`** : Ajouter `inventaireChantier: boolean` dans `EnterpriseFeatures`. Default `true` dans `defaultFeatures`.

**3 configs entreprise** : Activé par spread de `defaultFeatures` (rien à changer).

---

### Phase 3 — Hooks React Query (4 fichiers)

| Fichier | Contenu |
|---|---|
| `src/hooks/useInventoryTemplates.ts` | Query + mutations CRUD (insert/update/delete) par entreprise. Pattern identique à `useTodosChantier` + `useCreateTodo`. |
| `src/hooks/useInventoryReports.ts` | Query par chantier ou tous chantiers. Mutations create/update statut. Fetch du rapport mois-1 pour `previous_total`. |
| `src/hooks/useInventoryItems.ts` | Query par `report_id`. Mutation upsert batch (sauvegarde toutes les lignes d'un coup). |
| `src/hooks/useInventoryPhotos.ts` | Upload vers `inventory-photos/{reportId}/{itemId}/`, delete, list. Pattern identique à `useChantierDocuments` pour le storage. |

---

### Phase 4 — Interface Admin/Conducteur : Templates

**`src/components/admin/InventoryTemplatesManager.tsx`**

- Tableau des articles groupés par catégorie
- Ajout/suppression inline (désignation, unité, catégorie)
- Réordonnancement par boutons haut/bas

**`src/pages/AdminPanel.tsx`** : Ajout onglet "Inventaire" (icône `Package`) dans le TabsList, visible pour admin/conducteur (pas gestionnaire).

---

### Phase 5 — Interface Conducteur : Dashboard consolidation

**`src/components/conducteur/InventoryDashboard.tsx`**

- Liste des chantiers actifs avec badge statut (Aucun / Brouillon / Transmis)
- Pastille orange si total ≠ previous_total, rouge si baisse > 10%
- Click → dialog `InventoryReportDetail` avec lignes + photos inline

**`src/components/inventory/InventoryReportDetail.tsx`** : Dialog détail d'un rapport (lecture seule pour conducteur).

**`src/pages/ValidationConducteur.tsx`** : Ajout onglet "Inventaire" conditionnel.

---

### Phase 6 — Interface Chef : Saisie mobile-first

**`src/components/chantier/tabs/ChantierInventaireTab.tsx`**

- Logique d'initialisation :
  1. Rapport du mois courant existe → charger
  2. Sinon rapport mois-1 → pré-remplir `previous_total` avec `total` du mois-1
  3. Sinon → charger templates vides
- Bouton **"Copier les quantités du mois dernier"** : remplit `quantity_good` avec `previous_total` pour chaque ligne
- Accordéon par catégorie
- Pour chaque article : `InventoryItemRow`

**`src/components/inventory/InventoryItemRow.tsx`**

- 3 champs stepper (Bon / À réparer / Cassé) avec gros boutons +/- mobile-first
- Total auto-calculé affiché
- Indicateurs d'écart vs `previous_total` :
  - Pastille **orange** si total ≠ previous_total
  - Pastille **rouge** si baisse > 10%
  - Tooltip affichant "Mois précédent : X"
- Bouton "Photo" visible si `quantity_repair > 0 || quantity_broken > 0`
- Upload photo (caméra/fichier) via `useInventoryPhotos`
- Miniatures des photos existantes avec suppression

**Signature & envoi** :
- Bouton "Sauvegarder brouillon" (sauvegarde les items sans changer le statut)
- Bouton "Transmettre" → ouvre `SignaturePad` (composant existant réutilisé) → signature_data + statut TRANSMIS + transmitted_at
- Après transmission : formulaire passe en lecture seule pour le chef

**`src/pages/ChantierDetail.tsx`** : Ajout onglet "Inventaire" (icône `Package`), visible si feature `inventaireChantier` activée. readOnly pour conducteurs (consultation), éditable pour chefs.

---

### Fichiers créés (10)

| Fichier | Description |
|---|---|
| `supabase/migrations/20260401_inventory_tables.sql` | Tables, RLS, bucket, triggers |
| `src/hooks/useInventoryTemplates.ts` | CRUD templates |
| `src/hooks/useInventoryReports.ts` | CRUD rapports + fetch mois-1 |
| `src/hooks/useInventoryItems.ts` | CRUD lignes inventaire |
| `src/hooks/useInventoryPhotos.ts` | Upload/delete photos storage |
| `src/components/admin/InventoryTemplatesManager.tsx` | Paramétrage templates |
| `src/components/conducteur/InventoryDashboard.tsx` | Dashboard consolidation |
| `src/components/inventory/InventoryReportDetail.tsx` | Dialog détail rapport |
| `src/components/inventory/InventoryItemRow.tsx` | Ligne stepper mobile-first |
| `src/components/chantier/tabs/ChantierInventaireTab.tsx` | Tab saisie chef |

### Fichiers modifiés (4)

| Fichier | Changement |
|---|---|
| `src/config/enterprises/types.ts` | Ajout `inventaireChantier` dans features + default |
| `src/pages/ChantierDetail.tsx` | Ajout onglet Inventaire conditionnel |
| `src/pages/AdminPanel.tsx` | Ajout onglet Inventaire templates |
| `src/pages/ValidationConducteur.tsx` | Ajout onglet dashboard inventaire |

### Risque de régression

| Risque | Mitigation |
|---|---|
| ChantierDetail | Ajout conditionnel d'un onglet, zéro modification du code existant |
| AdminPanel / ValidationConducteur | Même pattern que tous les onglets existants |
| Tables existantes | Aucune modification, 3 nouvelles tables isolées |
| RLS | Copie exacte du pattern `get_selected_entreprise_id()` |
| Storage | Nouveau bucket isolé, aucun impact sur `chantier-documents` |

