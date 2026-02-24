
## Vous avez raison — la correction 1 est inutile et risquée

Après re-analyse du code, voici ce que j'ai constaté :

### Le tableau principal gère DÉJÀ le cas 4h + 4h

Dans `RHEmployeeDetail.tsx` (lignes 376-383), quand `siteDetails.length > 1`, le code affiche **les badges multi-site** :
```
CI000 (4h) + CI002 (4h)
```

Le champ `chantierNom` n'est utilisé que quand il y a **un seul site** (ligne 386). Donc changer `chantierNom` vers "le site dominant" est **inutile** — il n'est jamais affiché dans le cas multi-site.

Et dans le cas 4h = 4h, choisir un "gagnant" serait arbitraire et faux.

### Ce qui manque réellement

Le problème est uniquement dans le **dialog semaine** et le **PDF** : ils ne reçoivent pas `siteDetails` et affichent donc toujours un seul nom de chantier (celui du premier trouvé).

### Plan révisé — 3 corrections au lieu de 4

| # | Fichier | Changement |
|---|---------|-----------|
| ~~1~~ | ~~useRHData.ts~~ | ~~Annulé — pas nécessaire~~ |
| 2 | `RHEmployeeDetail.tsx` | Ajouter `siteDetails` dans le mapping vers le dialog (1 ligne, ligne 719) |
| 3 | `RHWeekDetailDialog.tsx` | Ajouter `siteDetails` dans l'interface `DayDetail` + afficher des badges multi-site dans la colonne Chantier quand `siteDetails.length > 1` |
| 4 | `rhWeekDetailPdfExport.ts` | Même chose dans le PDF : afficher `CI000 (4h) + CI002 (4h)` quand multi-site |

### Résultat pour tous les cas

| Cas | Tableau principal (déjà OK) | Dialog semaine (à corriger) | PDF (à corriger) |
|-----|---------------------------|---------------------------|-----------------|
| 8h chantier 1, 0h chantier 2 | `CI000 (8h) + CI002 (0h)` | `CI000 (8h) + CI002 (0h)` | `CI000 (8h) + CI002 (0h)` |
| 4h chantier 1, 4h chantier 2 | `CI000 (4h) + CI002 (4h)` | `CI000 (4h) + CI002 (4h)` | `CI000 (4h) + CI002 (4h)` |
| 8h chantier unique | `test - Senozan / CI000` | `test - Senozan / CI000` | `test - Senozan / CI000` |

Pas de "chantier dominant" à choisir — on affiche toujours le détail complet.
