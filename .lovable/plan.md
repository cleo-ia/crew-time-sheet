
# Correction : Persistance des données de saisie conducteur

## Problème

Les heures saisies pour les finisseurs (ex: 40h au lieu de 39h) ne sont pas sauvegardées après un refresh de page.

## Cause racine

Le `chantierId` n'est pas correctement propagé dans les jours (`entry.days[].chantierId`), ce qui fait échouer silencieusement l'auto-save.

Le bug se situe à la ligne 541 de `TimeEntryTable.tsx` :
```typescript
if (!currentDay.chantierCode) { // ❌ Vérifie le CODE, pas l'ID
```

Si `code_chantier_du_jour` est enregistré en base mais que le chantier correspondant n'est pas trouvé, le `chantierCode` est présent mais le `chantierId` reste `null`. L'auto-save skip alors l'employé car il n'a pas de chantier.

## Solution

Modifier la condition ligne 541 pour vérifier `chantierId` plutôt que `chantierCode` :

```typescript
if (!currentDay.chantierId) { // ✅ Vérifie l'ID (nécessaire pour la sauvegarde)
```

## Fichier modifié

`src/components/timesheet/TimeEntryTable.tsx` - Ligne 541

## Analyse de non-régression

| Page | Mode | Impact |
|------|------|--------|
| Index.tsx (Chef) | `chantierId` en prop | Aucun - le code modifié n'est exécuté qu'en mode conducteur |
| ValidationConducteur.tsx | mode conducteur | Correction appliquée - le chantierId sera toujours synchronisé depuis les affectations |
| FicheDetail.tsx (Lecture) | readOnly | Aucun - pas d'auto-save |
| FicheDetail.tsx (Édition) | mode edit | Aucun - utilise initialData avec chantierId déjà résolu |

## Comportement attendu après correction

1. L'utilisateur modifie les heures (39h → 40h)
2. Le `chantierId` est automatiquement rempli depuis les affectations
3. L'auto-save trouve un `chantierId` valide et sauvegarde les données
4. Après refresh, les données sont correctement restaurées (40h)
