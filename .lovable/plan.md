

# Plan : Harmoniser la détection des absences sur tous les composants

## Problème identifié

La correction de détection d'absence n'a été appliquée que partiellement :

| Composant | Usage | Logique actuelle | Corrigé ? |
|-----------|-------|------------------|-----------|
| `FicheDetail.tsx` | Vue conducteur "Modifier les données" | `hours === 0 && HI === 0` | ✅ Oui |
| `RHEmployeeDetail.tsx` | Vue RH détail employé | `heuresNormales === 0` | ✅ Oui |
| `TimeEntryTable.tsx` | Vue chef saisie heures | `hours === 0 && !PA && HI === 0` | ❌ Non |

## Impact

Un employé absent avec `PA = true` en base de données :
- ✅ Apparaît comme absent côté conducteur (corrigé)
- ✅ Pas de demande de trajet côté RH (corrigé)
- ❌ N'apparaît PAS comme absent côté chef (TimeEntryTable)

Cette incohérence affecte **toutes les entreprises** (SDER, Limoge Revillon, Engo Bourgogne) car le code est partagé.

## Solution

Appliquer la même correction dans `TimeEntryTable.tsx` :

**Fichier** : `src/components/timesheet/TimeEntryTable.tsx`

**Ligne 477** (mode chargement des données depuis la base) :

```text
Avant :
absent: hours === 0 && !PA && HI === 0,

Après :
absent: hours === 0 && HI === 0,
```

## Logique métier confirmée

Un employé est considéré **absent** si :
- `heures === 0` (aucune heure travaillée)
- ET `HI === 0` (aucune heure intempérie)

Le champ `PA` (panier repas) ne doit PAS être un critère car :
1. Un employé absent ne peut pas consommer de panier
2. La présence de `PA = true` avec 0h est une donnée incohérente héritée ou erronée

## Vérification complète

Après cette correction, la détection d'absence sera cohérente sur :
- Vue Chef (TimeEntryTable) - saisie initiale
- Vue Conducteur (FicheDetail) - validation/modification
- Vue RH (RHEmployeeDetail) - consultation détaillée

## Tests recommandés

1. Connecter en tant que Chef Limoge Revillon
2. Ouvrir une fiche avec un employé ayant 0h + PA = true
3. Vérifier que l'employé apparaît bien comme absent (fond grisé/rouge)

