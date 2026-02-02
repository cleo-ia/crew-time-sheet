
# Plan : Corriger le filtrage des jours par chantier dans TimeEntryTable

## Problème identifié

Quand un employé (Slah BEYA) est partagé entre deux chantiers sur différents jours avec le **même chef** :
- **COEUR DE BALME EST** : Lundi, Mardi (2 jours)
- **LE ROSEYRAN** : Mercredi, Jeudi, Vendredi (3 jours)

L'interface de "Saisie hebdomadaire" affiche 39h (5 jours) sur **les deux chantiers** au lieu de respecter les jours planifiés pour chaque chantier.

### Cause racine vérifiée

Les données dans `affectations_jours_chef` sont **CORRECTES** :
- Slah BEYA a bien 2 jours sur COEUR DE BALME EST et 3 jours sur LE ROSEYRAN
- Le problème est uniquement côté **affichage/filtrage**

**Ligne 252-255 de TimeEntryTable.tsx** :
```typescript
const { data: affectationsJoursChef = [] } = useAffectationsJoursByChef(
  chefId || null,  // ← Filtre par chef
  weekId           // ← Filtre par semaine
  // ❌ PAS DE FILTRE PAR CHANTIER !
);
```

**Ligne 314-316** (vérification) :
```typescript
return affectationsJoursChef.some(
  aff => aff.macon_id === employeeId && aff.jour === targetDate
  // ❌ PAS DE VÉRIFICATION DU CHANTIER !
);
```

Résultat : Le chef FAY sélectionne ROSEYRAN → le hook ramène les 5 affectations de Slah BEYA (2 COEUR + 3 ROSEYRAN) → `isDayAuthorizedForEmployee` dit "OK" pour tous les jours.

## Modifications à apporter

### Fichier 1 : `src/hooks/useAffectationsJoursChef.ts`

**Objectif** : Ajouter une nouvelle fonction qui filtre aussi par `chantier_id`

**Position** : Après la fonction `useAffectationsJoursByMacon` (ligne 77)

```typescript
// Récupérer les affectations jours par chef ET par chantier pour une semaine
export const useAffectationsJoursByChefAndChantier = (
  chefId: string | null, 
  chantierId: string | null,
  semaine: string
) => {
  return useQuery({
    queryKey: ["affectations-jours-chef", "by-chef-chantier", chefId, chantierId, semaine],
    queryFn: async () => {
      if (!chefId || !chantierId || !semaine) return [];
      
      const { data, error } = await supabase
        .from("affectations_jours_chef")
        .select("*")
        .eq("chef_id", chefId)
        .eq("chantier_id", chantierId)  // ✅ FILTRE PAR CHANTIER
        .eq("semaine", semaine);
      
      if (error) throw error;
      return data as AffectationJourChef[];
    },
    enabled: !!chefId && !!chantierId && !!semaine,
  });
};
```

### Fichier 2 : `src/components/timesheet/TimeEntryTable.tsx`

**Modification 1 - Ligne 31** : Importer le nouveau hook

```typescript
import { useAffectationsJoursByChef, useAffectationsJoursByChefAndChantier, getDayNamesFromDates } from "@/hooks/useAffectationsJoursChef";
```

**Modification 2 - Lignes 250-255** : Remplacer le hook par le nouveau avec `chantierId`

Avant :
```typescript
const { data: affectationsJoursChef = [] } = useAffectationsJoursByChef(
  isPlanningActive && !isConducteurMode && mode !== "edit" ? chefId || null : null,
  weekId
);
```

Après :
```typescript
const { data: affectationsJoursChef = [] } = useAffectationsJoursByChefAndChantier(
  isPlanningActive && !isConducteurMode && mode !== "edit" ? chefId || null : null,
  isPlanningActive && !isConducteurMode && mode !== "edit" ? chantierId : null,  // ✅ AJOUT
  weekId
);
```

**Modification 3 - Ligne 314-316** : Ajouter vérification de sécurité (optionnel mais recommandé)

```typescript
return affectationsJoursChef.some(
  aff => aff.macon_id === employeeId && 
         aff.jour === targetDate &&
         aff.chantier_id === chantierId  // ✅ SÉCURITÉ SUPPLÉMENTAIRE
);
```

## Résumé des modifications

| Fichier | Modification | Lignes |
|---------|--------------|--------|
| `useAffectationsJoursChef.ts` | Nouveau hook avec filtre `chantier_id` | Après ligne 77 |
| `TimeEntryTable.tsx` | Import du nouveau hook | Ligne 31 |
| `TimeEntryTable.tsx` | Utiliser le nouveau hook avec `chantierId` | Lignes 252-255 |
| `TimeEntryTable.tsx` | Vérification `chantier_id` dans `isDayAuthorizedForEmployee` | Ligne 314-316 |

## Résultat attendu après correction

| Chantier | Slah BEYA - Jours affichés | Heures calculées |
|----------|---------------------------|------------------|
| COEUR DE BALME EST | Lundi, Mardi (Me-J-V grisés "Jour non affecté") | ~15.5h |
| LE ROSEYRAN | Mercredi, Jeudi, Vendredi (L-M grisés "Jour non affecté") | ~23.5h |

## Tests à effectuer après déploiement

1. Ouvrir "Saisie hebdomadaire" pour COEUR DE BALME EST
   - Vérifier que Slah BEYA n'affiche que Lundi et Mardi éditables
   - Vérifier que Mercredi, Jeudi, Vendredi sont grisés avec "Jour non affecté"

2. Ouvrir "Saisie hebdomadaire" pour LE ROSEYRAN
   - Vérifier que Slah BEYA n'affiche que Mercredi, Jeudi, Vendredi éditables
   - Vérifier que Lundi et Mardi sont grisés avec "Jour non affecté"

3. Vérifier les totaux d'heures
   - COEUR DE BALME EST : ~15.5h pour Slah BEYA
   - LE ROSEYRAN : ~23.5h pour Slah BEYA
