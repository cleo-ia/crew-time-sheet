

# Plan : Bloquer les employés gérés par un chef dans le dialog conducteur

## Contexte

Le composant `FinisseursDispatchWeekly.tsx` permet au conducteur d'ajouter des employés à son équipe de finisseurs. Actuellement, il utilise le hook legacy `useAffectations()` qui vérifie la table `affectations` avec la condition `date_fin === null`. Or, le système moderne utilise `affectations_jours_chef` pour gérer les affectations hebdomadaires des chefs.

## Modification proposée

### Fichier unique : `src/components/conducteur/FinisseursDispatchWeekly.tsx`

**1. Ajouter l'import du hook existant (ligne 42)**

```typescript
import { useAffectationsJoursChef } from "@/hooks/useAffectationsJoursChef";
```

**2. Remplacer le hook legacy (ligne 81)**

Avant :
```typescript
const { data: affectationsChefs } = useAffectations();
```

Après :
```typescript
const { data: affectationsChefSemaine = [] } = useAffectationsJoursChef(semaine);
```

**3. Réécrire `isFinisseurAffectedByChef` (lignes 206-212)**

```typescript
const isFinisseurAffectedByChef = (finisseurId: string): boolean => {
  return affectationsChefSemaine.some(
    (aff) => aff.macon_id === finisseurId
  );
};

const getChefAffectedDaysCount = (finisseurId: string): number => {
  return affectationsChefSemaine.filter(
    (aff) => aff.macon_id === finisseurId
  ).length;
};
```

**4. Mettre à jour `getEmployeStatus` (lignes 271-275)**

```typescript
const getEmployeStatus = (employeId: string) => {
  const chefDaysCount = getChefAffectedDaysCount(employeId);
  if (chefDaysCount > 0) {
    return { 
      type: "chef", 
      label: chefDaysCount === 5 ? "Géré par chef" : `${chefDaysCount}/5 jours chef`,
      className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      blocked: true
    };
  }
  // ... reste inchangé ...
};
```

**5. Mettre à jour `handleAddEmploye` (lignes 300-311)**

Ajouter la vérification du flag `blocked` pour bloquer l'ajout.

## Résumé technique

| Élément | Changement |
|---------|------------|
| Import | Ajouter `useAffectationsJoursChef` |
| Hook | Remplacer `useAffectations()` par `useAffectationsJoursChef(semaine)` |
| `isFinisseurAffectedByChef` | Vérifier dans `affectationsChefSemaine` au lieu de `affectationsChefs` |
| `getChefAffectedDaysCount` | Nouvelle fonction pour compter les jours |
| `getEmployeStatus` | Retourner `blocked: true` si géré par chef |
| Bouton "+" | Masquer/désactiver si `status.blocked === true` |

## Analyse d'impact - Aucune régression

Cette modification est **totalement isolée** :

- Le hook `useAffectationsJoursChef(semaine)` existe déjà et fonctionne
- Aucun autre fichier n'est modifié
- Le hook legacy `useAffectations()` reste disponible ailleurs
- Les query keys sont différentes → pas de conflit de cache

## Résultat attendu

| Employé | Avant | Après |
|---------|-------|-------|
| Slah BEYA (5/5 jours chef) | "Disponible" + bouton "+" actif | "Géré par chef" (cyan) + bouton masqué |
| Employé avec 3/5 jours chef | "Disponible" + bouton "+" actif | "3/5 jours chef" (cyan) + bouton masqué |
| Employé disponible | "Disponible" + bouton "+" actif | Inchangé |

## Tests à effectuer

1. Vérifier que Slah BEYA affiche "5/5 jours chef" ou "Géré par chef" avec badge cyan
2. Vérifier que le bouton "+" n'apparaît pas pour les employés gérés par chef
3. Vérifier qu'un employé sans affectation chef reste "Disponible" et cliquable
4. Vérifier que la page Index (Saisie hebdo) fonctionne toujours normalement
5. Vérifier que ChefMaconsManager fonctionne toujours normalement

