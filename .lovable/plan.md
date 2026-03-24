

## Trier la boucle sync pour traiter les chefs en premier

### Probleme
Dans `syncEntreprise`, la boucle principale (ligne 780) itere sur `planningByEmployeChantier` dans l'ordre d'insertion du Map. Si un ouvrier est traite avant le chef de son chantier, la fiche de l'ouvrier peut etre creee avec un `user_id` (chef) qui n'a pas encore sa propre fiche initialisee. Ce n'est pas un bug bloquant (les donnees finales sont correctes) mais ca genere des traitements dans le desordre et des logs confus.

### Correction

**Fichier:** `supabase/functions/sync-planning-to-teams/index.ts`

1. **Apres la construction de `planningByEmployeChantier`** (ligne ~556), trier les entries pour que les chefs passent en premier. Concretement, convertir le Map en tableau d'entries, trier avec les chefs (`employe.role_metier === 'chef'`) en tete, puis iterer sur ce tableau trie au lieu du Map brut.

2. **Remplacement de la boucle ligne 780** : au lieu de `for (const [key, affectations] of planningByEmployeChantier)`, on fait :
```typescript
const sortedEntries = [...planningByEmployeChantier.entries()].sort(([, a], [, b]) => {
  const aIsChef = a[0]?.employe?.role_metier === 'chef' ? 0 : 1
  const bIsChef = b[0]?.employe?.role_metier === 'chef' ? 0 : 1
  return aIsChef - bIsChef
})

for (const [key, affectations] of sortedEntries) {
```

3. **Ajout d'un log** pour confirmer l'ordre de traitement : `console.log(\`[sync-planning-to-teams] Ordre: ${chefCount} chef(s) traités en premier sur ${sortedEntries.length} entrées\`)`

Zero impact sur les donnees ou la logique existante — seul l'ordre d'iteration change. Les chefs sont traites avant les ouvriers, garantissant que leurs fiches et affectations existent deja quand on traite les ouvriers du meme chantier.

