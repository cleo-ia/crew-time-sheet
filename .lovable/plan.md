

## Problème : les photos uploadées ne s'affichent pas

### Cause racine

Dans `handlePhotoAdd` (ligne 98-104 de `ChantierInventaireTab.tsx`), la première ligne fait :
```ts
if (!currentReport) return;
```

Quand le chef commence un inventaire pour la première fois, aucun rapport n'existe encore en base (`currentReport` est `null`). L'upload est donc silencieusement ignoré — pas d'erreur, pas de feedback, la photo disparaît dans le vide.

### Solution

Modifier `handlePhotoAdd` pour **créer automatiquement le rapport** s'il n'existe pas encore (comme le fait déjà `handleSave`), puis uploader la photo avec le `reportId` obtenu.

### Fichier modifié

**`src/components/chantier/tabs/ChantierInventaireTab.tsx`** — `handlePhotoAdd` (lignes 98-104) :

```ts
const handlePhotoAdd = useCallback(async (idx: number, file: File) => {
  let reportId = currentReport?.id;

  // Créer le rapport automatiquement s'il n'existe pas
  if (!reportId) {
    const report = await createReport.mutateAsync({ chantierId });
    reportId = report.id;
  }

  const url = await uploadPhoto.mutateAsync({ reportId, file });
  setLocalItems(prev => prev.map((item, i) => 
    i === idx ? { ...item, photos: [...item.photos, url] } : item
  ));
}, [currentReport, uploadPhoto, createReport, chantierId]);
```

Un seul changement dans un seul fichier. Les photos apparaîtront immédiatement dans la liste sous l'article après upload.

