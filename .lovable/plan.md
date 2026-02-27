

## Plan : Bouton Export PDF dans le header de la vue agence

### Fichier : `src/pages/RapprochementInterim.tsx`

**1. Ajouter un état dédié pour l'export depuis la vue agence** (~ligne 27)

Ajouter : `const [showAgenceExportDialog, setShowAgenceExportDialog] = useState(false);`

**2. Ajouter le bouton Export PDF dans le header agence** (ligne 136-148)

Modifier le header pour placer un bouton `Export PDF` à droite (via `justify-between` + `ml-auto`) :

```tsx
<div className="flex items-center justify-between ...">
  <div className="flex items-center gap-4">
    <Button variant="ghost" ...>Retour</Button>
    <Building2 ... />
    <h1 ...>{selectedAgence}</h1>
    <Badge ...>...</Badge>
  </div>
  <Button variant="outline" size="sm" onClick={() => setShowAgenceExportDialog(true)}>
    <Download className="h-4 w-4 mr-1" />
    Export PDF
  </Button>
</div>
```

**3. Ajouter une seconde instance de `InterimaireExportDialog`** (~avant la fermeture `</PageLayout>`)

```tsx
<InterimaireExportDialog
  open={showAgenceExportDialog}
  onOpenChange={setShowAgenceExportDialog}
  filters={{ ...filters, agenceInterim: selectedAgence ?? undefined }}
/>
```

Ce filtre force l'agence sélectionnée, donc le dialogue n'affichera que cette agence.

