

# Correction : les modifications RH doivent se refléter dans le pré-export

## Le problème

Dans le pré-export Excel, la chaîne de priorité pour afficher les absences et trajets est :

1. Modification locale (session en cours) -- OK
2. **Override sauvegardé en base** (ex: ABS_INJ = 29) -- **bloque le recalcul**
3. Valeur calculée depuis les fiches_jours -- jamais atteinte

Quand Tanguy ajoute une absence INJ depuis la vue consolidée, les `fiches_jours` sont bien mis à jour. Mais l'ancien override sauvegardé (29h) masque la nouvelle valeur calculée (qui devrait être 36h par exemple).

## La solution

Retirer les overrides sauvegardés de la chaîne de priorité d'affichage. Seules les modifications faites dans la session en cours (via les inputs du pré-export) doivent pouvoir surcharger les valeurs calculées.

Les overrides restent sauvegardés en base et utilisés pour l'export Excel final -- aucun changement de ce côté.

## Détail technique

### Fichier : `src/components/rh/RHPreExport.tsx`

**1. Supprimer la lecture des overrides sauvegardés** (lignes 367-369) :
```
// Supprimer ces 3 lignes :
// Lire les overrides sauvegardés en base (absences_export_override / trajets_export_override)
const savedAbsOverride = ...
const savedTrajOverride = ...
```

**2. Simplifier la chaîne de priorité** pour toutes les absences (lignes 398-407) :

Avant :
```
case "absenceAbsInj": return row.modified.absenceAbsInj ?? savedAbsOverride?.ABS_INJ ?? absencesByType.ABS_INJ ?? 0;
```

Après :
```
case "absenceAbsInj": return row.modified.absenceAbsInj ?? absencesByType.ABS_INJ ?? 0;
```

Même changement pour les 10 types d'absences (CP, RTT, AM, MP, AT, CONGE_PARENTAL, HI, CPSS, ABS_INJ, ECOLE).

**3. Même simplification pour les trajets** (lignes 415-435) :

Avant :
```
case "trajetT1": return row.modified.trajetT1 ?? savedTrajOverride?.T1 ?? data.trajetT1 ?? 0;
```

Après :
```
case "trajetT1": return row.modified.trajetT1 ?? data.trajetT1 ?? 0;
```

Même changement pour les 21 codes trajets (T_PERSO, T1 a T17, T31, T35, GD).

## Résultat attendu

- Toute modification faite par Tanguy dans la vue consolidée (ajout d'absence, changement de trajet, etc.) sera immédiatement visible dans le pré-export au prochain chargement
- Les ajustements manuels dans le pré-export continuent de fonctionner normalement
- L'export Excel final utilise toujours les données les plus récentes

