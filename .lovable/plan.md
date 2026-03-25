

# Correction urgente — 0 trajets dans la vue consolidée

## Cause identifiée

La colonne `T` **n'est pas sélectionnée** dans la requête `fiches_jours` de `rhShared.ts` (ligne 456). Donc `jourRef.T` est toujours `undefined`, et notre garde `(Number(jourRef.T) || 0) > 0` est toujours `false` — résultat : 0 trajets pour tout le monde.

## Correction (1 seul fichier, 1 ligne)

### `src/hooks/rhShared.ts` — Ligne 456

Ajouter `T` dans la liste des colonnes sélectionnées :

```
AVANT:
"fiche_id, date, HNORM, HI, PA, repas_type, code_trajet, trajet_perso, heures, ..."

APRÈS:
"fiche_id, date, HNORM, HI, PA, T, repas_type, code_trajet, trajet_perso, heures, ..."
```

C'est tout. La logique `trajetActif` aux lignes 736-738 est correcte — elle ne fonctionnait pas uniquement parce que la donnée `T` n'était jamais chargée depuis la BDD.

