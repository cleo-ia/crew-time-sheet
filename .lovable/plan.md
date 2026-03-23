

## Plan : 3 regles de verrouillage temporel

### Contexte

Le flux actuel a deja une feature flag `contrainteVendredi12h` (utilisee dans `Index.tsx` pour les chefs). On va etendre cette logique a 3 endroits et creer 2 nouvelles fonctions utilitaires.

### Regle 1 — Verrouiller le planning le vendredi

**Fichier** : `src/pages/PlanningMainOeuvre.tsx`

- Ajouter un calcul `isPlanningLocked` : vrai si la semaine affichee est la semaine courante ET que le jour Paris est vendredi/samedi/dimanche.
- Quand `isPlanningLocked` :
  - Desactiver les boutons "Valider", "Modifier", "Synchroniser maintenant", "Copier S-1"
  - Passer les `PlanningChantierAccordion` en read-only (desactiver `onDayToggle`, `onRemoveEmploye`, `onAddEmploye`, `onVehiculeChange`)
  - Afficher un bandeau jaune : "Planning verrouille le vendredi — les modifications sont bloquees pour la semaine en cours"
- Le planning des semaines S+1 et suivantes reste modifiable normalement.

### Regle 2 — Bloquer la transmission de S avant vendredi (chefs)

**Deja partiellement implemente** dans `src/pages/Index.tsx` via `isContrainteVendredi12h` + `isAfterFriday12hParis()`. C'est actif pour Limoge-Revillon (temporairement desactive).

- **Aucun changement de code** necessaire ici, la logique existe deja.
- Il faudra simplement reactiver le flag dans la config entreprise quand pret.

### Regle 3 — Bloquer la transmission de S avant vendredi (conducteurs)

**Fichier** : `src/pages/ValidationConducteur.tsx` (handleSaveAndSign, ~ligne 419)

- Ajouter la meme verification que `Index.tsx` : si `isContrainteVendredi12h` et `isCurrentWeek(selectedWeek)` et pas vendredi/samedi/dimanche → bloquer avec toast.
- Ajouter un bandeau d'avertissement dans l'UI (comme dans Index.tsx).

**Fichier** : `src/pages/SignatureFinisseurs.tsx` (handleSubmit, ~ligne 282)

- Ajouter la meme verification avant soumission : si `isContrainteVendredi12h` et `isCurrentWeek(semaine)` et pas vendredi → bloquer avec toast.

### Nouvelle fonction utilitaire

**Fichier** : `src/lib/date.ts`

Ajouter `isFridayOrWeekendParis()` : retourne true si le jour courant a Paris est vendredi, samedi ou dimanche (sans condition d'heure, contrairement a `isAfterFriday12hParis` qui attend 12h).

```typescript
export const isFridayOrWeekendParis = (): boolean => {
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
  });
  const weekday = formatter.format(new Date()).toLowerCase();
  return ['vendredi', 'samedi', 'dimanche'].includes(weekday);
};
```

### Resume des fichiers touches

| Fichier | Modification |
|---------|-------------|
| `src/lib/date.ts` | Ajouter `isFridayOrWeekendParis()` |
| `src/pages/PlanningMainOeuvre.tsx` | Verrouillage planning semaine S le vendredi |
| `src/pages/ValidationConducteur.tsx` | Bloquer transmission S avant vendredi |
| `src/pages/SignatureFinisseurs.tsx` | Bloquer transmission S avant vendredi |

### Protection S-1

Aucune restriction sur S-1 ou anterieur. Les verifications portent uniquement sur `isCurrentWeek(semaine)`.

### Feature flag

Le verrouillage planning (regle 1) sera actif pour toutes les entreprises (pas de feature flag — c'est une regle metier universelle). Les regles 2 et 3 (transmission) utilisent le flag `contrainteVendredi12h` existant.

