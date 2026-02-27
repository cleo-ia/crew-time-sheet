

## Ajouter le bouton "Vider le cache" en bas de la page Rapprochement Intérim

**Fichier : `src/pages/RapprochementInterim.tsx`**

1. Importer `clearCacheAndReload` depuis `@/hooks/useClearCache`
2. Importer l'icône `RefreshCw` depuis `lucide-react`
3. Ajouter en bas de page (avant la fermeture du `<div>` principal) un bouton centré reprenant le style de la capture :

```tsx
<div className="flex justify-center py-6">
  <Button variant="outline" onClick={clearCacheAndReload} className="text-muted-foreground">
    <RefreshCw className="h-4 w-4 mr-2" />
    Problème d'affichage ? Vider le cache
  </Button>
</div>
```

