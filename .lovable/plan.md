

# Plan : Bloquer les employés affectés 5/5 jours à un autre conducteur

## Contexte du bug

**Domingos Fernandes DA SILVA** est affecté 5/5 jours à "LES TERRASSES DE ROMANCHES" (chantier sans chef) géré par **Romain DYE**.

Quand **Jorge GONCALVES** ouvre "Gérer mon équipe", Domingos apparaît comme "Disponible" car :
- La table `affectations_jours_chef` est vide (pas de chef)
- Le hook `useFinisseursPartiellementAffectes` filtre uniquement 1-4 jours, excluant les 5/5

## Analyse technique

La faille se trouve dans le hook `useFinisseursPartiellementAffectes` :

```typescript
// src/hooks/useAffectationsFinisseursJours.ts (lignes 67-80)
return Array.from(countMap.entries())
  .filter(([_, count]) => count >= 1 && count <= 4) // ← Ne capture pas les 5/5 !
  .map(([id, _]) => id);
```

## Solution proposée

### Étape 1 : Créer un nouveau hook pour récupérer les employés complets d'autres conducteurs

Ajouter dans `src/hooks/useAffectationsFinisseursJours.ts` :

```typescript
// Récupérer les employés affectés à d'AUTRES conducteurs (toute durée)
export const useEmployesAffectedByOtherConducteurs = (
  currentConducteurId: string, 
  semaine: string
) => {
  return useQuery({
    queryKey: ["employes-autres-conducteurs", currentConducteurId, semaine],
    queryFn: async () => {
      if (!currentConducteurId || !semaine) return [];
      
      const { data, error } = await supabase
        .from("affectations_finisseurs_jours")
        .select("finisseur_id, conducteur_id, date")
        .eq("semaine", semaine)
        .neq("conducteur_id", currentConducteurId);
      
      if (error) throw error;
      
      // Compter les jours par finisseur et par conducteur
      const countMap = new Map<string, { conducteurId: string; count: number }>();
      (data || []).forEach(a => {
        if (!countMap.has(a.finisseur_id)) {
          countMap.set(a.finisseur_id, { conducteurId: a.conducteur_id, count: 0 });
        }
        countMap.get(a.finisseur_id)!.count++;
      });
      
      return Array.from(countMap.entries()).map(([finisseurId, info]) => ({
        finisseurId,
        conducteurId: info.conducteurId,
        daysCount: info.count
      }));
    },
    enabled: !!currentConducteurId && !!semaine,
  });
};
```

### Étape 2 : Mettre à jour `FinisseursDispatchWeekly.tsx`

**Import du nouveau hook :**

```typescript
import {
  // ... hooks existants ...
  useEmployesAffectedByOtherConducteurs,
} from "@/hooks/useAffectationsFinisseursJours";
```

**Récupérer les données :**

```typescript
const { data: employesAutresConducteurs = [] } = useEmployesAffectedByOtherConducteurs(
  conducteurId, 
  semaine
);
```

**Charger les noms des conducteurs :**

```typescript
// Déjà disponible via useUtilisateursByRoles ou un hook dédié
const conducteurNamesMap = useMemo(() => {
  // Map conducteur_id → nom complet
  // ...
}, []);
```

**Mettre à jour `getEmployeStatus` :**

```typescript
const getEmployeStatus = (employeId: string) => {
  // 1. Affecté par un chef cette semaine ?
  const chefDaysCount = getChefAffectedDaysCount(employeId);
  if (chefDaysCount > 0) {
    return { 
      type: "chef", 
      label: chefDaysCount === 5 ? "Géré par chef" : `${chefDaysCount}/5 jours chef`,
      className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      blocked: true
    };
  }
  
  // 2. NOUVEAU: Affecté à un AUTRE conducteur ?
  const autreConducteur = employesAutresConducteurs.find(e => e.finisseurId === employeId);
  if (autreConducteur) {
    const conducteurNom = conducteurNamesMap.get(autreConducteur.conducteurId) || "autre conducteur";
    return { 
      type: "autre-conducteur", 
      label: autreConducteur.daysCount === 5 
        ? `Géré par ${conducteurNom}` 
        : `${autreConducteur.daysCount}/5 j. ${conducteurNom}`,
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      blocked: true // Bloqué si affecté à un autre conducteur (peu importe le nombre de jours)
    };
  }
  
  // ... reste inchangé ...
};
```

## Résumé technique

| Fichier | Modification |
|---------|--------------|
| `src/hooks/useAffectationsFinisseursJours.ts` | Ajouter `useEmployesAffectedByOtherConducteurs` |
| `src/components/conducteur/FinisseursDispatchWeekly.tsx` | Importer le hook + mettre à jour `getEmployeStatus` |

## Résultat attendu

| Employé | Situation | Avant | Après |
|---------|-----------|-------|-------|
| Domingos Fernandes | 5/5 jours avec Romain DYE | "Disponible" ✅ | "Géré par Romain DYE" 🔒 |
| Employé partiel | 3/5 jours avec autre conducteur | "Autre conducteur" | "3/5 j. [Nom]" 🔒 |
| Employé dispo | Aucune affectation | "Disponible" | "Disponible" ✅ |

## Analyse d'impact - Aucune régression

1. **Nouveau hook isolé** : `useEmployesAffectedByOtherConducteurs` est une nouvelle query indépendante
2. **Query key distincte** : Pas de conflit avec les hooks existants
3. **Modification UI uniquement** : Seul le dialogue "Gérer mon équipe" est impacté
4. **Aucun autre fichier modifié** : Pages chef, RH, planning restent inchangées

## Tests à effectuer

1. ✅ Domingos Fernandes affiche "Géré par Romain DYE" pour Jorge GONCALVES
2. ✅ Le bouton "+" est masqué/désactivé pour les employés bloqués
3. ✅ Un employé sans affectation reste "Disponible" et cliquable
4. ✅ La page "Saisie chef" fonctionne normalement
5. ✅ Le planning S+1 fonctionne normalement

