

## Correction visibilité RH des employés à 0h

### Problème
Les employés avec fiches `ENVOYE_RH` mais sans `fiches_jours` sont invisibles côté RH car le filtre ligne 574 de `rhShared.ts` exige `totalHeures > 0 || absences > 0 || paniers > 0`.

### Correction

**Fichier** : `src/hooks/rhShared.ts`, ligne 574

**Avant :**
```typescript
if (totalHeures > 0 || absences > 0 || paniers > 0) {
```

**Après :**
```typescript
const hasRHFiche = fiches.some(f => ["ENVOYE_RH", "AUTO_VALIDE", "CLOTURE"].includes(f.statut));
if (totalHeures > 0 || absences > 0 || paniers > 0 || hasRHFiche) {
```

### Impact
- 1 ligne modifiée dans `src/hooks/rhShared.ts`
- BAH, FIGUEIRA, G. LACROIX, M. LACROIX apparaîtront dans la vue RH SCHUMAN S08 avec 0h, permettant à Tanguy de corriger
- Aucun impact sur les employés déjà visibles

