
# Plan : Elargir les colonnes Code Chantier dans l'export PDF Interimaire

## Probleme identifie

Dans l'export PDF interimaire (`src/lib/pdfExportInterimaire.ts`), les colonnes des jours ont une largeur fixe de **16mm** (ligne 130). Cette largeur est insuffisante pour afficher les codes chantier complets comme "CI893OLYMPIA" (13+ caracteres), causant un debordement ou une troncature.

## Solution proposee

Augmenter la largeur des colonnes jours de **16mm a 24mm** pour accommoder les codes chantier longs. Cette modification impactera :
- La largeur totale du tableau
- La position de la colonne "Signature"

## Modifications

### Fichier : `src/lib/pdfExportInterimaire.ts`

**Ligne 130** - Augmenter la largeur des colonnes jours :
```text
Avant:  const colDay = 16;
Apres:  const colDay = 24;
```

**Impact calcule** :
- Largeur actuelle : `colLabel(18) + colDay(16)*5 + colTotal(16) + colSignature(30) = 144mm`
- Nouvelle largeur : `colLabel(18) + colDay(24)*5 + colTotal(16) + colSignature(30) = 184mm`
- Largeur page A4 : 210mm - 2*marge(10mm) = 190mm de contenu disponible

Le tableau restera dans les marges de la page A4.

### Ajustement complementaire

**Ligne 132** - Reduire legerement la colonne signature si necessaire :
```text
Avant:  const colSignature = 30;
Apres:  const colSignature = 26;
```

Nouvelle largeur totale : `18 + 24*5 + 16 + 26 = 180mm` (bien centre sur les 190mm disponibles)

## Resultat attendu

- Les codes chantier comme "CI893OLYMPIA" seront affiches en entier dans chaque cellule
- Le tableau restera bien centre et lisible
- La colonne signature conserve assez d'espace pour afficher les signatures
