

## Plan : Brancher les logs d'activité RH

### Etat des lieux

Après inspection du code, voici ce qui existe déjà et ce qui reste à faire :

| Action | Etat actuel | A faire |
|--------|------------|---------|
| `cloture_periode` | Déjà logué dans `ClotureDialog.tsx` (L234) + dans `ACTION_CONFIG` | Ajouter `details.message` lisible |
| `export_paie` | Logué dans `RHPreExport.tsx` (L382) + dans `ACTION_CONFIG` | Ajouter le log dans `ExportPaie.tsx` et `ConsultationRH.tsx` + `details.message` |
| `correction_rh` | Des logs existent dans `RHEmployeeDetail.tsx` mais avec des actions variées (`modification_heures_normales`, `modification_heures_intemperies`, `modification_type_absence`) qui ne sont PAS dans `ACTION_CONFIG` | Unifier sous `correction_rh` + ajouter à `ACTION_CONFIG` |

---

### Fichiers modifiés

**1. `src/components/rh/ClotureDialog.tsx`** (ajustement mineur)
- Ajouter `message: "Clôture de la période [Période] effectuée."` dans le champ `details` du log existant (L234-247).

**2. `src/pages/ExportPaie.tsx`**
- Importer `useLogModification` et `useCurrentUserInfo`.
- Dans `handleExportExcel` : après succès, appeler `logModification.mutate` avec `action: 'export_paie'` et `details.message: "Export paie généré pour [Période]"`.
- Dans `handleExportVentilation` : idem avec `action: 'export_paie'` et message adapté "Export ventilation PDF généré pour [Période]".

**3. `src/pages/ConsultationRH.tsx`**
- Importer `useLogModification` et `useCurrentUserInfo`.
- Dans `handleExport` (L94) : après génération Excel réussie, log `export_paie` avec message.
- Dans `handleExportChefs2CB` (L145) : idem.
- Dans `handleExportVentilation` : idem.

**4. `src/components/rh/RHEmployeeDetail.tsx`**
- Remplacer les actions `modification_heures_normales`, `modification_heures_intemperies`, `modification_type_absence` par `correction_rh`.
- Adapter le `details` pour inclure `message: "Correction administrative : [Champ] modifié pour [Salarié]"`.

**5. `src/components/shared/ModificationHistoryTable.tsx`**
- Ajouter dans `ACTION_CONFIG` :
  - `correction_rh: { label: "Correction RH", variant: "secondary" }`
- Le `details.message` sera affiché automatiquement par le fallback existant quand `champ_modifie` contient la valeur technique.

