
# Plan de correction : Bug d'affichage Trajet + GD

## Contexte du probleme

Les cases "Trajet" et "GD" (Grand Deplacement) peuvent apparaitre cochees simultanement dans l'interface, alors qu'elles devraient etre mutuellement exclusives. Ce probleme a deux causes :

1. **Affichage UI** : La condition `checked={dayData.trajet !== false}` en ligne 1526 de `TimeEntryTable.tsx` retourne `true` si `dayData.trajet` est `undefined`, causant l'affichage de "Trajet" coche meme quand "GD" est actif.

2. **Donnees inconsistantes** : 230 enregistrements dans `fiches_jours` ont `T=1` avec `code_trajet` egal a 'GD' ou 'T_PERSO', ce qui viole l'exclusivite mutuelle.

## Modifications a effectuer

### 1. Correction de l'affichage UI

**Fichier** : `src/components/timesheet/TimeEntryTable.tsx`

Ligne 1526 - Modifier la condition de la checkbox "Trajet" :

```text
Avant:  checked={dayData.trajet !== false}
Apres:  checked={dayData.trajet === true}
```

Cette modification garantit que la checkbox "Trajet" n'est cochee que si `dayData.trajet` est explicitement `true`, evitant les faux positifs quand la valeur est `undefined`.

### 2. Validation cote sauvegarde (6 fichiers)

Ajouter une logique pour forcer `T=0` quand `code_trajet` est 'GD' ou 'T_PERSO' dans tous les hooks de sauvegarde.

**Fichier 1** : `src/hooks/useSaveFicheJours.ts`

Lignes 86 et 139 - Modifier le calcul de T pour les updates et inserts :

```text
Avant:  T: dayData.trajet ? 1 : 0
Apres:  T: (dayData.codeTrajet === 'GD' || dayData.codeTrajet === 'T_PERSO') ? 0 : (dayData.trajet ? 1 : 0)
```

**Fichier 2** : `src/hooks/useAutoSaveFiche.ts`

Ligne 301 - Modifier la logique :

```text
Avant:  T: dayData?.codeTrajet === null || dayData?.codeTrajet === undefined ? 1 : (dayData.codeTrajet ? 1 : 0)
Apres:  T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0 : 1
```

**Fichier 3** : `src/pages/ValidationConducteur.tsx`

Ligne 319 :

```text
Avant:  T: dayData.trajet ? 1 : 0
Apres:  T: (dayData.codeTrajet === 'GD' || dayData.codeTrajet === 'T_PERSO') ? 0 : (dayData.trajet ? 1 : 0)
```

**Fichier 4** : `src/pages/Index.tsx`

Ligne 414 :

```text
Avant:  T: d.data.trajet ? 1 : 0
Apres:  T: (d.data.codeTrajet === 'GD' || d.data.codeTrajet === 'T_PERSO') ? 0 : (d.data.trajet ? 1 : 0)
```

### 3. Migration SQL pour nettoyer les donnees existantes

Creer une migration pour corriger les 230 enregistrements incohérents :

```sql
-- Correction des enregistrements ou T=1 avec code_trajet GD ou T_PERSO
-- Ces options sont mutuellement exclusives avec le trajet standard

UPDATE fiches_jours 
SET "T" = 0
WHERE "T" = 1 
  AND code_trajet IN ('GD', 'T_PERSO');
```

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/timesheet/TimeEntryTable.tsx` | Condition affichage checkbox Trajet |
| `src/hooks/useSaveFicheJours.ts` | Validation T lors update/insert |
| `src/hooks/useAutoSaveFiche.ts` | Validation T lors auto-save |
| `src/pages/ValidationConducteur.tsx` | Validation T lors transmission |
| `src/pages/Index.tsx` | Validation T lors sauvegarde chef |
| Migration SQL | Nettoyage des 230 enregistrements |

## Resultat attendu

Apres ces modifications :
- L'affichage sera correct : seule une option parmi Trajet/Trajet Perso/GD sera cochee
- Les nouvelles sauvegardes garantiront l'exclusivite mutuelle au niveau base de donnees
- Les donnees existantes seront corrigees pour eliminer les inconsistances
