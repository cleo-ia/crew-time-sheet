

## Correction du dialog "Appliquer à plusieurs jours" - mauvaise taille et position

### Diagnostic

Le `AlertDialog` du `CodeTrajetSelector` est rendu **a l'interieur d'une `TableCell`** dans `RHEmployeeDetail.tsx`. Le composant `AlertDialogContent` utilise `position: fixed` avec `z-50`, mais un element parent (probablement le container avec `overflow` ou un `transform`) cree un nouveau contexte de positionnement CSS, ce qui fait que le `fixed` se positionne relativement a ce parent au lieu du viewport.

### Correction

**Fichier** : `src/components/timesheet/CodeTrajetSelector.tsx`

Forcer le `AlertDialogPortal` a se rendre dans `document.body` explicitement et augmenter le z-index du contenu pour qu'il passe au-dessus de tout :

1. Importer `AlertDialogPortal` et `AlertDialogOverlay` depuis le composant alert-dialog
2. Remplacer `AlertDialogContent` par une structure manuelle utilisant `AlertDialogPortal` avec `container={document.body}` pour garantir le rendu hors du contexte CSS parent
3. Conserver le bouton X tel quel
4. Garder tout le reste identique (logique, texte, boutons)

L'objectif est que le dialog s'affiche centré au milieu de l'ecran, en pleine taille, exactement comme avant.

