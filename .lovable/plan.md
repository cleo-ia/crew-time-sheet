

## Ajouter le logo entreprise sur les PDF Ventilation Analytique

### Contexte
Les PDF de ventilation affichent actuellement "Limoge Revillon" en texte simple en haut à gauche. Le logo est deja importé dans le fichier (`logoLimogeRevillon`) mais jamais utilisé dans le rendu PDF.

### Ce qui change
On remplace le texte "Limoge Revillon" par l'image du logo **uniquement sur la première page de chaque section** (Ouvrier, Intérimaire, Recap). Les pages suivantes gardent le texte comme aujourd'hui. La mise en page reste identique (mêmes positions, mêmes marges).

### Fichier modifié
`src/lib/ventilationExport.ts` -- 1 seul fichier

### Modifications

1. **Ajouter un helper `getEntrepriseLogo()`** (comme dans `pdfExportInterimaire.ts`) qui retourne le bon logo selon le slug entreprise en localStorage.

2. **Export complet (`exportVentilationCompletePdf`)** -- Modifier `drawPageHeader()` (ligne 440) pour dessiner le logo via `pdf.addImage()` à la place du texte entreprise. Cette fonction est appelée 3 fois (sections Ouvrier, Intérim, Recap). Les headers "minimal" des pages suivantes restent en texte.

3. **Export individuel Recap (`exportRecapChantierPdf`)** -- Remplacer le `drawText(entrepriseName...)` ligne 825 par `pdf.addImage(logo...)` sur la première page uniquement.

4. **Export individuel Ouvrier (`exportVentilationOuvrierPdf`)** -- Remplacer dans `drawPageHeaderFull()` ligne 933. Le `drawPageHeaderMinimal()` reste en texte.

5. **Export individuel Intérim (`exportVentilationInterimPdf`)** -- Remplacer dans `drawPageHeaderFull()` ligne 1135. Le `drawPageHeaderMinimal()` reste en texte.

### Détails techniques
- Logo : `pdf.addImage(logo, "PNG", margin, 5, 35, 18)` -- même taille que les autres exports (35x18mm)
- Fallback : si le logo échoue (`try/catch`), on affiche le texte comme aujourd'hui
- Le reste de l'en-tête (date, titre, période) ne bouge pas
- Le logo uploadé sera copié dans `src/assets/` pour remplacer l'existant si meilleure qualité

