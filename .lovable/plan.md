

## Nettoyage de la fiche parasite GUNDUZ Erdal - OLYMPIA S13

### Ce qui sera supprimé (vérifié en base)

| Table | Nb lignes | Critère |
|---|---|---|
| `fiches_jours` | 5 | `fiche_id = '22d502ce-...'` (toutes à 0h, type_absence NULL) |
| `signatures` | 1 | `fiche_id = '22d502ce-...'` |
| `fiches` | 1 | `id = '22d502ce-...'` (OLYMPIA, S13, 0h, ENVOYE_RH) |
| `affectations_jours_chef` | 5 | `macon_id = '2030aa2b-...'` + `chantier_id = '121fe254-...'` + `semaine = '2026-S13'` |

### Ce qui ne sera PAS touché
- Les fiches ghost d'arrêt de travail (chantier_id = null) restent intactes
- Aucune autre fiche de GUNDUZ n'est affectée
- Aucune donnée d'un autre employé n'est touchée

### Migration SQL

Ordre de suppression respectant les dépendances :
1. DELETE `fiches_jours` WHERE `fiche_id = '22d502ce-a472-4eda-be0b-d553221801f9'`
2. DELETE `signatures` WHERE `fiche_id = '22d502ce-a472-4eda-be0b-d553221801f9'`
3. DELETE `fiches` WHERE `id = '22d502ce-a472-4eda-be0b-d553221801f9'`
4. DELETE `affectations_jours_chef` WHERE `macon_id = '2030aa2b-e7ce-48dc-b5cc-5fc68f6bf494'` AND `chantier_id = '121fe254-c301-40b4-88eb-85c858d4265a'` AND `semaine = '2026-S13'`

### Fichier modifié

| Fichier | Changement |
|---|---|
| Nouvelle migration SQL | Suppression ciblée des 12 lignes parasites par IDs exacts |

### Résultat
Le badge "absence à qualifier" disparaîtra pour GUNDUZ Erdal.

