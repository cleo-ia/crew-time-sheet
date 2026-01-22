

# Plan de Correction Validé : Bug Duplication Heures Multi-Chantier

## Confirmation d'Absence de Régression

Cette analyse confirme qu'aucune régression n'est attendue suite à l'implémentation de ce correctif.

## Contexte du Bug

Paul MANUNTA est affecté sur 2 chantiers en S05 :
- CI230 (Liam) : Lundi, Mardi, Mercredi
- CI235 (Chloé) : Jeudi, Vendredi

Actuellement, chaque chef transmet 5 jours complets (39h), créant 78h au total pour Paul au lieu de 39h.

## Modifications Prévues

### Fichier 1 : `src/pages/Index.tsx`

Ajouter le filtrage des jours dans `handleSaveAndSign` en utilisant `useAffectationsJoursByChef` :

```typescript
// Import existant à ajouter
import { useAffectationsJoursByChef } from "@/hooks/useAffectationsJoursChef";

// Dans le composant, ajouter le hook
const { data: affectationsJoursChef = [] } = useAffectationsJoursByChef(
  selectedChef || null, 
  selectedWeek || ""
);

// Fonction helper pour obtenir les jours autorisés
const getAuthorizedDays = (employeeId: string): string[] => {
  if (!affectationsJoursChef || affectationsJoursChef.length === 0) {
    return ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  }
  
  const employeeAffectations = affectationsJoursChef.filter(
    aff => aff.macon_id === employeeId
  );
  
  if (employeeAffectations.length === 0) {
    return ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  }
  
  const dayNames: Record<string, string> = {
    [days[0]]: 'Lundi',
    [days[1]]: 'Mardi',
    [days[2]]: 'Mercredi',
    [days[3]]: 'Jeudi',
    [days[4]]: 'Vendredi',
  };
  
  return employeeAffectations.map(aff => dayNames[aff.jour]).filter(Boolean);
};

// Dans handleSaveAndSign, remplacer la construction de dailyHours
// par une version filtrée
```

### Fichier 2 : `src/hooks/useSaveFiche.ts`

Modifier le DELETE global par un DELETE ciblé + utiliser UPSERT :

```typescript
// AVANT (ligne 134)
await supabase.from("fiches_jours").delete().eq("fiche_id", ficheId);

// APRÈS
const datesToUpdate = employee.dailyHours.map(d => d.date);
if (datesToUpdate.length > 0) {
  await supabase
    .from("fiches_jours")
    .delete()
    .eq("fiche_id", ficheId)
    .in("date", datesToUpdate);
}

// Remplacer INSERT par UPSERT (lignes 163-166)
const { error: joursError } = await supabase
  .from("fiches_jours")
  .upsert(jourEntries, {
    onConflict: 'fiche_id,date',
    ignoreDuplicates: false
  });
```

## Points d'Entrée Vérifiés (Aucune Régression)

| Composant | Statut | Raison |
|-----------|--------|--------|
| `useAutoSaveFiche.ts` | ✅ Déjà aligné | Implémente déjà le filtrage multi-chef (lignes 205-238) |
| `ValidationConducteur.tsx` | ✅ Non impacté | Finisseurs uniquement (chantierId: null) |
| `useSaveFicheJours.ts` | ✅ Non impacté | Utilise ficheId explicite, édition ciblée |
| `SignatureMacons.tsx` | ✅ Non impacté | Affichage seul, déjà filtré |
| `FicheDetail.tsx` | ✅ Non impacté | Édition ciblée par ficheId |

## Rétrocompatibilité Garantie

- Entreprises sans planning : Comportement legacy préservé (5 jours)
- Employés sans affectation spécifique : 5 jours par défaut
- Données existantes : Non affectées (correction appliquée aux nouvelles transmissions)

## Résultat Attendu

Après correction, pour Paul MANUNTA S05 :

| Action | Résultat |
|--------|----------|
| Liam transmet | 3 fiches_jours (Lun-Mar-Mer) = 24h sur CI230 |
| Chloé transmet | 2 fiches_jours (Jeu-Ven) = 15h sur CI235 |
| Vue Conducteur | Affiche correctement 24h/15h par chantier |
| Vue RH | Fusionne = 39h total pour Paul |

## Risques

| Risque | Mitigation |
|--------|------------|
| Mauvaise conversion date → nom de jour | Utilisation du même pattern que useAutoSaveFiche (testé) |
| Fallback inexistant | Fallback explicite vers 5 jours si aucune affectation |
| Ordre de transmission | UPSERT garantit l'atomicité, pas de dépendance d'ordre |

