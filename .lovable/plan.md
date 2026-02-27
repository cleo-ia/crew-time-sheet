

## Fix : InterimaireExportDialog dans le bloc early return agence

### Fichier : `src/pages/RapprochementInterim.tsx`

**Ligne 226-228** — Ajouter le `InterimaireExportDialog` juste avant `</PageLayout>` dans le bloc `if (selectedAgence)` :

```tsx
        </div>
        <InterimaireExportDialog
          open={showAgenceExportDialog}
          onOpenChange={setShowAgenceExportDialog}
          filters={{ ...filters, agenceInterim: selectedAgence ?? undefined }}
        />
      </PageLayout>
```

C'est la seule modification nécessaire. Le dialog sera maintenant monté dans le DOM quand la vue agence est affichée, et le bouton fonctionnera.

