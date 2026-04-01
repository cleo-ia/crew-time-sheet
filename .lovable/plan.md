

## Rendre l'unité modifiable sur chaque ligne de matériel

### Objectif

Permettre au conducteur de modifier l'unité d'un matériel directement dans la liste, en remplaçant le texte statique par un `Select` cliquable.

### Fichier modifié

`src/components/admin/InventoryTemplatesManager.tsx`

### Changement

**Ligne 328** : Remplacer le `TableCell` affichant `{t.unite}` en texte brut par un composant `Select` inline utilisant `UNIT_OPTIONS`, qui appelle `updateTemplate.mutate({ id: t.id, unite: newValue })` au changement.

```text
Avant :  <TableCell className="w-20 text-muted-foreground">{t.unite}</TableCell>

Après :  <TableCell className="w-28">
           <Select value={t.unite} onValueChange={(v) => updateTemplate.mutate({ id: t.id, unite: v })}>
             <SelectTrigger className="h-7 text-xs border-none shadow-none">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
             </SelectContent>
           </Select>
         </TableCell>
```

Le hook `useUpdateInventoryTemplate` est déjà importé et utilisé dans le composant (pour le move/rename). Aucun nouveau hook nécessaire.

### Risque

Aucun — remplacement d'un affichage texte par un Select, même mutation existante.

