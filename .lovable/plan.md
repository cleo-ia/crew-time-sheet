
# Plan de correction : Décalage colonnes Excel et colonne "h supp à 50%" manquante

## Diagnostic

Après analyse du fichier `src/lib/excelExport.ts`, j'ai identifié les problèmes suivants :

### Problème 1 : Décalage entre en-têtes et données

Dans **headerRow4** (lignes 265-326), l'ordre des colonnes pour les heures supplémentaires est :
- Position 28 : "h supp à 25%"
- Position 29 : "h supp à 50%"
- Position 30 : "NB PANIERS"

Mais le groupe **HEURES SUPP** dans la ligne 3 (ligne 229-230) ne définit que 2 colonnes vides après l'en-tête du groupe, ce qui cause un décalage.

### Problème 2 : Merge de cellules incorrect

Le merge pour HEURES SUPP (ligne 489) :
```javascript
sheet.mergeCells(3, 27, 3, 28); // HEURES SUPP
```

Fusionne les colonnes 27-28, mais après l'ajout de la colonne EF, les vraies positions sont décalées.

### Problème 3 : Indices de couleurs décalés

Les plages de couleurs (lignes 514-522 et 548-556) utilisent des indices fixes qui ne correspondent plus à la vraie structure après ajout des colonnes.

---

## Solution proposée

### Étape 1 : Corriger l'ordre des en-têtes dans headerRow3 (ligne 3)

Vérifier que le groupe HEURES SUPP a bien 2 colonnes vides correspondant à "h supp à 25%" et "h supp à 50%".

**Correction** : Dans headerRow3, s'assurer que :
- Colonnes 27-28 = HEURES SUPP (2 colonnes pour 25% et 50%)
- Colonne 29 = REPAS (NB PANIERS)

### Étape 2 : Recalculer les positions des merges

Mettre à jour les indices des `mergeCells` pour correspondre à la vraie structure :
- ABSENCES EN HEURES : colonnes 16-27 (DATE, CP, RTT, AM, MP, AT, Congé parental, Intempéries, CPSS, ABS INJ, ECOLE, EF) = 12 colonnes
- HEURES SUPP : colonnes 28-29 (25%, 50%) = 2 colonnes  
- REPAS : colonne 30 = 1 colonne
- TRAJETS : colonnes 31-52 = 22 colonnes

### Étape 3 : Ajuster les plages de couleurs

Mettre à jour les conditions dans les boucles de style pour utiliser les bons indices :
- Absences : 16-27
- Heures supp : 28-29
- Repas : 30
- Trajets : 31-52
- etc.

---

## Détails techniques

### Fichier modifié
`src/lib/excelExport.ts`

### Modifications à effectuer

1. **headerRow3 (ligne 203-261)** : Vérifier les positions vides pour chaque groupe

2. **headerRow4 (ligne 265-326)** : Confirmer que l'ordre est :
   - 15 vides (données contractuelles)
   - DATE, CP, RTT, AM, MP, AT, Congé parental, Intempéries, CPSS, ABS INJ, ECOLE, EF (12 colonnes)
   - h supp à 25%, h supp à 50% (2 colonnes)
   - NB PANIERS (1 colonne)
   - TOTAL, T Perso, T1-T17, T31, T35, GD (22 colonnes)
   - Colonnes administratives

3. **mergeCells (ligne 488-492)** : Corriger les indices
   ```javascript
   sheet.mergeCells(3, 16, 3, 27); // ABSENCES EN HEURES (12 colonnes)
   sheet.mergeCells(3, 28, 3, 29); // HEURES SUPP (2 colonnes)
   sheet.mergeCells(3, 31, 3, 52); // TRAJETS (22 colonnes)
   ```

4. **Plages de couleurs en-têtes (ligne 514-522)** : Ajuster les indices
   ```javascript
   if (c >= 1 && c <= 15) bg = COLOR_SCHEME.CONTRACTUAL_HEADER;
   else if (c >= 16 && c <= 27) bg = COLOR_SCHEME.ABSENCES_HEADER;
   else if (c >= 28 && c <= 29) bg = COLOR_SCHEME.OVERTIME_HEADER;
   else if (c === 30) bg = COLOR_SCHEME.MEALS_HEADER;
   else if (c >= 31 && c <= 52) bg = COLOR_SCHEME.TRANSPORT_HEADER;
   // etc.
   ```

5. **Plages de couleurs données (ligne 548-556)** : Mêmes ajustements

---

## Impact

- **Export RH complet** : Colonnes correctement alignées avec les données
- **Export Chefs 2CB** : Même correction (utilise la même fonction `generateRHExcel`)
- **Colonne "h supp à 50%"** : Visible et correctement positionnée

---

## Tests recommandés

1. Générer un export Excel RH complet après la correction
2. Vérifier visuellement que toutes les colonnes d'en-tête correspondent aux données
3. Confirmer que "h supp à 25%" et "h supp à 50%" sont toutes deux visibles
4. Tester l'export Chefs 2CB pour confirmer la même correction
