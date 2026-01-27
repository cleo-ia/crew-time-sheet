
# Plan de correction : Mode Legacy pour le Planning

## Contexte du probleme

Le chef Jerome DEPART voit son equipe avec 0h et tous les jours marques comme "Jour non affecte" en S05. Cela vient du fait que :
- Le hook `useMaconsByChantier` a ete corrige pour ignorer le planning si non valide
- MAIS les autres composants (`TimeEntryTable`, `SignatureMacons`, etc.) continuent d'utiliser `affectations_jours_chef` pour filtrer les jours

## Objectif

Tant que le planning n'est pas officiellement valide par un conducteur, l'application doit fonctionner en mode legacy :
- Pas de badge "Jour non affecte"
- Tous les jours sont editables
- Les totaux incluent tous les jours travailles
- Le chef compose son equipe manuellement via "Gerer mon equipe"

## Solution technique

### Etape 1 : Creer un hook centralise pour verifier le mode planning

Creer un nouveau hook `usePlanningMode` qui retourne un booleen indiquant si le planning est actif pour une semaine donnee.

```text
src/hooks/usePlanningMode.ts
+----------------------------------+
| usePlanningMode(semaine: string) |
| Returns: { isActive: boolean }   |
+----------------------------------+
        |
        v
  Requete planning_validations
        |
        v
  isActive = true si validation existe
```

### Etape 2 : Modifier TimeEntryTable.tsx

Ajouter le hook `usePlanningMode` et modifier la logique :

1. Si `isActive === false`, forcer `isDayAuthorizedForEmployee` a retourner `true` pour tous les jours
2. Ne pas charger `affectationsJoursChef` si le planning n'est pas actif

Fichier : `src/components/timesheet/TimeEntryTable.tsx`

Modifications :
- Ligne ~247-250 : Conditionner le chargement de `useAffectationsJoursByChef` a `isActive`
- Ligne ~253-285 : Modifier `isDayAuthorizedForEmployee` pour ignorer le filtrage si `!isActive`

### Etape 3 : Modifier Index.tsx

Dans la fonction `handleSaveAndSign`, ne pas filtrer les jours si le planning n'est pas actif.

Fichier : `src/pages/Index.tsx`

Modifications :
- Ligne ~292-295 : Conditionner le chargement de `useAffectationsJoursByChef`
- Ligne ~372-390 : Si planning non actif, retourner tous les jours

### Etape 4 : Modifier SignatureMacons.tsx

Conditionner le filtrage des ficheJours selon le mode planning.

Fichier : `src/pages/SignatureMacons.tsx`

Modifications :
- Ligne ~34 : Conditionner le chargement de `useAffectationsJoursByChef`
- Ligne ~43-79 : Si planning non actif, retourner les donnees sans filtrage

### Etape 5 : Modifier useAutoSaveFiche.ts

Ne pas filtrer les jours a sauvegarder si le planning n'est pas actif.

Fichier : `src/hooks/useAutoSaveFiche.ts`

Modifications :
- Ligne ~258-282 : Ajouter une verification du mode planning avant de filtrer

### Etape 6 : Modifier ChefMaconsManager.tsx

Empecher la creation d'entrees dans `affectations_jours_chef` si le planning n'est pas actif (puisque ces donnees ne seront pas utilisees de toute facon).

Fichier : `src/components/chef/ChefMaconsManager.tsx`

Modifications :
- Ligne ~294-318 : Ne pas appeler `createDefaultAffectationsJours` ni `updateJoursForMember` si planning non actif

## Resume des fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/hooks/usePlanningMode.ts` | NOUVEAU - Hook centralise |
| `src/components/timesheet/TimeEntryTable.tsx` | Conditionner filtrage jours |
| `src/pages/Index.tsx` | Conditionner filtrage transmission |
| `src/pages/SignatureMacons.tsx` | Conditionner filtrage recapitulatif |
| `src/hooks/useAutoSaveFiche.ts` | Conditionner filtrage sauvegarde |
| `src/components/chef/ChefMaconsManager.tsx` | Ne pas creer affectations si legacy |

## Comportement attendu apres correction

1. Chef Jerome DEPART ouvre S05
2. Le systeme detecte : pas de validation planning pour S05 -> mode legacy
3. Toute l'equipe s'affiche avec les heures saisies
4. Aucun badge "Jour non affecte"
5. Le chef peut modifier tous les jours normalement
6. La transmission inclut tous les jours travailles

## Retrocompatibilite

- Les donnees existantes dans `affectations_jours_chef` sont ignorees (pas supprimees)
- Des qu'un conducteur valide le planning S+1, le mode planning s'active automatiquement
- Le blocage des salaries deja affectes reste actif (via table `affectations`)

## Section technique detaillee

### Nouveau hook usePlanningMode

```typescript
// src/hooks/usePlanningMode.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePlanningMode = (semaine: string) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  const { data: isActive = false, isLoading } = useQuery({
    queryKey: ["planning-mode", entrepriseId, semaine],
    queryFn: async () => {
      if (!entrepriseId || !semaine) return false;
      
      const { data, error } = await supabase
        .from("planning_validations")
        .select("id")
        .eq("entreprise_id", entrepriseId)
        .eq("semaine", semaine)
        .maybeSingle();
      
      if (error) throw error;
      return data !== null;
    },
    enabled: !!entrepriseId && !!semaine,
    staleTime: 30000, // Cache 30 secondes
  });
  
  return { isActive, isLoading };
};
```

### Modification de isDayAuthorizedForEmployee

```typescript
// Dans TimeEntryTable.tsx
const { isActive: isPlanningActive } = usePlanningMode(weekId);

const isDayAuthorizedForEmployee = useCallback((employeeId: string, dayName: string): boolean => {
  // Si planning non actif -> mode legacy, tous les jours autorises
  if (!isPlanningActive) return true;
  
  // Le chef est toujours autorise
  if (chefId && employeeId === chefId) return true;
  
  // Mode conducteur gere separement
  if (isConducteurMode) return true;
  
  // Mode edit autorise tout
  if (mode === "edit") return true;
  
  // Retrocompatibilite si pas d'affectations
  if (!affectationsJoursChef || affectationsJoursChef.length === 0) return true;
  
  // Verifier l'affectation pour ce jour
  const monday = parseISOWeek(weekId);
  const dayIndex = { "Lundi": 0, "Mardi": 1, "Mercredi": 2, "Jeudi": 3, "Vendredi": 4 }[dayName];
  if (dayIndex === undefined) return true;
  
  const targetDate = format(addDays(monday, dayIndex), "yyyy-MM-dd");
  return affectationsJoursChef.some(
    aff => aff.macon_id === employeeId && aff.jour === targetDate
  );
}, [isPlanningActive, chefId, isConducteurMode, mode, affectationsJoursChef, weekId]);
```
