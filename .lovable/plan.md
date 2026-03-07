

## Plan : Fix des 2 bugs de collision ghost fiche (LD + congés / multi-congés)

### Fichier modifie

`supabase/functions/sync-planning-to-teams/index.ts`

### Modification 1 : Bloc absences longue duree (lignes 1391-1468)

Remplacer le `if (existingGhost) { continue }` et restructurer le bloc :

- `let ghostFicheId = existingGhost?.id || null`
- Deplacer le calcul des `joursAbsence` AVANT la creation de fiche
- `if (!ghostFicheId)` → creer la fiche ghost, `ghostFicheId = newFiche.id`, incrementer compteurs
- `else` → log "Reutilisation fiche ghost existante"
- Upsert `fiches_jours` avec `fiche_id: ghostFicheId` (au lieu de `newFiche.id`)
- Ajouter `ignoreDuplicates: true` dans les options upsert : `{ onConflict: 'fiche_id,date', ignoreDuplicates: true }`
- `results.push` avec `action: ghostFicheId === existingGhost?.id ? 'merged' : 'created'`

### Modification 2 : Bloc conges valides (lignes 1521-1597)

Meme pattern exact :

- `let ghostFicheId = existingGhost?.id || null`
- Deplacer le calcul des `joursConge` AVANT la creation de fiche
- `if (!ghostFicheId)` → creer la fiche ghost, `ghostFicheId = newFicheConge.id`, incrementer compteurs
- `else` → log "Reutilisation fiche ghost existante pour conge"
- Upsert `fiches_jours` avec `fiche_id: ghostFicheId` (au lieu de `newFicheConge.id`)
- Ajouter `ignoreDuplicates: true` : `{ onConflict: 'fiche_id,date', ignoreDuplicates: true }`
- `results.push` avec `action: ghostFicheId === existingGhost?.id ? 'merged' : 'created'`

### Ce qui ne change pas

- Requetes de detection `existingGhost` identiques
- Ordre d'execution (LD avant conges) identique
- Aucun autre fichier modifie
- `ignoreDuplicates: true` = INSERT ON CONFLICT DO NOTHING (securite theorique, premier ecrivain gagne)

