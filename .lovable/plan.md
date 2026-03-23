

## Plan : Verrouiller le ChantierSelector par jour pour chefs et conducteurs

### Probleme

Dans `TimeEntryTable.tsx` (ligne 1279), le selecteur de chantier par jour permet a n'importe quel utilisateur de changer le chantier d'imputation. Cela peut creer des fiches orphelines et corrompre la ventilation analytique.

### Modification unique

**Fichier** : `src/components/timesheet/TimeEntryTable.tsx` (ligne 1328)

```
Avant :  disabled={isReadOnly || isDayBlocked}
Apres :  disabled={isReadOnly || isDayBlocked || mode !== "conducteur"}
```

### Analyse d'impact par contexte

| Contexte | mode | Resultat | Correct ? |
|----------|------|----------|-----------|
| Index.tsx (chef saisie) | `"create"` (defaut) | Verrouille | Oui — le chantier vient du planning |
| FicheDetail.tsx lecture | `"edit"` + readOnly | Verrouille | Oui — deja en lecture seule |
| FicheDetail.tsx edition | `"edit"` | Verrouille | Oui — le conducteur corrige les heures, pas le chantier |
| ValidationConducteur.tsx saisie | `"conducteur"` | Modifiable | Oui — ses finisseurs peuvent changer de chantier dans la semaine |

### Garantie zero regression

- Le chantier par jour est toujours **affiche** (valeur visible dans le selecteur) — seule l'interaction est desactivee.
- Le `code_chantier_du_jour` dans `fiches_jours` reste correctement initialise par la sync planning, il n'est simplement plus modifiable manuellement.
- Les conducteurs en mode saisie directe conservent la flexibilite pour leurs finisseurs multi-chantier.
- La ventilation analytique (`useVentilationAnalytique`) continue de lire `code_chantier_du_jour` sans changement.
- Aucun autre composant n'utilise `ChantierSelector` avec un mode different.

