

## Permettre la sélection de "AUCUN" même quand c'est la valeur par défaut

### Problème

Le Select affiche `"AUCUN"` par défaut quand il n'y a pas de ligne en base. Mais Radix Select ne déclenche pas `onValueChange` si on re-sélectionne la même valeur. Résultat : impossible de stocker "AUCUN" en base pour les employés non encore configurés.

### Solution

Distinguer visuellement et logiquement "pas configuré" de "AUCUN stocké".

**Fichier : `src/pages/CodesTrajet.tsx`**

1. Changer la valeur par défaut quand il n'y a pas de mapping : utiliser une valeur sentinelle `"_NON_DEFINI"` au lieu de `"AUCUN"`
2. Ajouter `"_NON_DEFINI"` comme première option du Select avec le label "— Non défini —" (grisé)
3. Garder `"AUCUN"` comme deuxième option avec le label "— Aucun trajet —"
4. Quand l'utilisateur sélectionne `"AUCUN"`, ça déclenche bien le `onValueChange` (car la valeur passe de `"_NON_DEFINI"` à `"AUCUN"`)
5. Adapter `hasCode` : un employé est "défini" si `current !== "_NON_DEFINI"` (donc AUCUN compte comme défini)
6. Adapter `getDefinedCount` de la même façon

### Résultat visuel

- Employé non configuré → affiche "— Non défini —" (grisé)
- Employé avec AUCUN trajet → affiche "— Aucun trajet —" (normal, comptabilisé)
- Employé avec T1, T2, etc. → comme avant

### Détails techniques

- La constante `TRAJET_OPTIONS` sera modifiée pour avoir `_NON_DEFINI` en premier et `AUCUN` en second
- Le `handleChange` enverra `"AUCUN"` au mutation qui le stockera en base (déjà fait)
- Si l'utilisateur veut "annuler" un code défini, il sélectionne "— Non défini —" → on supprime la ligne en base (restore du delete dans le hook)

