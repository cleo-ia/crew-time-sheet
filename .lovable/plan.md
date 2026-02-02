

# Analyse d'Impact Complète : Aucune Régression Garantie

## Résumé de la Modification

Permettre aux chefs **multi-chantier uniquement** de sélectionner comme conducteur n'importe quel membre de leurs équipes (tous chantiers confondus) dans la fiche de trajet.

## Architecture Actuelle Analysée

### Fichiers utilisant `useMaconsByChantier`

| Fichier | Contexte d'utilisation | Impact de la modification |
|---------|------------------------|--------------------------|
| `TransportDayAccordion.tsx` | Fiche de trajet - sélection conducteur | **MODIFIÉ** - ajout conditionnel pour multi-chantier |
| `TransportSheet.tsx` | Ancienne version fiche trajet | **MODIFIÉ** - même logique pour cohérence |
| `CongesSheet.tsx` | Demandes de congés - liste équipe | **NON IMPACTÉ** - besoin local (équipe du chantier actuel) |
| `Index.tsx` | Page principale - passe les données | **NON IMPACTÉ** - utilise déjà le hook standard |
| `ChefMaconsManager.tsx` | Gestion équipe chef | **NON IMPACTÉ** - logique différente |
| `SignatureMacons.tsx` | Page signatures | **NON IMPACTÉ** - hook différent (chantier spécifique) |

### Fichiers utilisant `ConducteurCombobox`

| Fichier | Contexte | Impact |
|---------|----------|--------|
| `TransportDayAccordion.tsx` | TransportSheetV2 (version actuelle) | **MODIFIÉ** |
| `TransportSheet.tsx` | TransportSheet (ancienne version) | **MODIFIÉ** pour cohérence |

## Plan Technique

### 1. Créer un nouveau hook (nouveau fichier)

**Fichier** : `src/hooks/useMaconsAllChantiersByChef.ts`

Ce hook :
- Récupère tous les `chantier_id` distincts où le chef a des affectations pour la semaine
- Si 1 seul chantier → `isMultiChantier = false`
- Si plusieurs chantiers → récupère les employés de TOUS ces chantiers avec indication du chantier d'origine

```typescript
interface MaconFromAllChantiers {
  id: string;
  nom: string;
  prenom: string;
  isChef?: boolean;
  chantierId: string;
  chantierCode?: string;  // Pour affichage ex: "BALME"
  ficheJours?: FicheJour[];
}

interface UseMaconsAllChantiersResult {
  isMultiChantier: boolean;
  allMacons: MaconFromAllChantiers[];
  isLoading: boolean;
}
```

### 2. Modifier `TransportDayAccordion.tsx`

```typescript
// Importer le nouveau hook
import { useMaconsAllChantiersByChef } from "@/hooks/useMaconsAllChantiersByChef";

// Dans le composant
const { data: macons = [] } = useMaconsByChantier(chantierId, semaine, chefId);
const { isMultiChantier, allMacons, isLoading: loadingAllMacons } = useMaconsAllChantiersByChef(chefId, semaine);

// Utiliser conditionnellement
const maconsForCombobox = isMultiChantier ? allMacons : macons;

// Passer au ConducteurCombobox
<ConducteurCombobox
  macons={maconsForCombobox}
  currentChantierId={chantierId}  // Nouveau prop pour afficher le chantier d'origine
  ...
/>
```

### 3. Modifier `ConducteurCombobox.tsx` (optionnel - amélioration UX)

Ajouter un indicateur visuel pour les employés venant d'un autre chantier :

```typescript
// Props ajoutées
interface ConducteurComboboxProps {
  macons: MaconData[];
  currentChantierId?: string;  // Nouveau
  ...
}

// Dans le rendu
{macon.chantierId && macon.chantierId !== currentChantierId && (
  <span className="text-xs text-muted-foreground ml-1">
    ({macon.chantierCode || 'Autre chantier'})
  </span>
)}
```

### 4. Modifier `TransportSheet.tsx` (ancienne version - cohérence)

Appliquer la même logique pour maintenir la cohérence si cette version est encore utilisée quelque part.

## Pourquoi Aucune Régression

### 1. Modification conditionnelle et isolée

La modification n'affecte le comportement **QUE** pour les chefs multi-chantier :

```typescript
// Chef mono-chantier : comportement IDENTIQUE
if (!isMultiChantier) {
  // Utilise macons standard → aucun changement
}

// Chef multi-chantier : nouveau comportement
if (isMultiChantier) {
  // Utilise allMacons → accès à tous les employés
}
```

### 2. Aucun changement sur les autres pages

| Page/Composant | Hook utilisé | Changement |
|----------------|--------------|------------|
| SignatureMacons | `useAffectationsJoursByChefAndChantier` | ❌ Aucun |
| TimeEntryTable | `useAffectationsJoursByChefAndChantier` | ❌ Aucun |
| ChefMaconsManager | `useAffectationsJoursByChef` | ❌ Aucun |
| CongesSheet | `useMaconsByChantier` | ❌ Aucun - utilise toujours l'équipe locale |

### 3. Le nouveau hook est indépendant

Le nouveau hook `useMaconsAllChantiersByChef` :
- Ne modifie **AUCUN** hook existant
- Est utilisé **UNIQUEMENT** dans les composants transport
- Retourne `isMultiChantier = false` pour les chefs mono-chantier

### 4. Rétrocompatibilité totale

- Les chefs mono-chantier ne voient **AUCUN** changement
- Les conducteurs (mode verrouillé) ne sont **PAS** impactés
- Le mode legacy (sans planning validé) reste fonctionnel

## Scénarios de Test Post-Implémentation

| Scénario | Résultat attendu |
|----------|------------------|
| Chef mono-chantier sur fiche trajet | Voit uniquement son équipe locale |
| Chef multi-chantier sur chantier A | Voit employés de A + employés de B avec indicateur |
| Chef multi-chantier sur chantier B | Voit employés de B + employés de A avec indicateur |
| Conducteur sur fiche trajet | Champs verrouillés, aucun changement |
| Saisie heures (TimeEntryTable) | Aucun changement |
| Signatures (SignatureMacons) | Aucun changement |
| Gestion équipe (ChefMaconsManager) | Aucun changement |

## Fichiers Modifiés

1. **Nouveau** : `src/hooks/useMaconsAllChantiersByChef.ts`
2. **Modifié** : `src/components/transport/TransportDayAccordion.tsx`
3. **Modifié** : `src/components/transport/ConducteurCombobox.tsx` (indicateur visuel)
4. **Modifié** : `src/components/transport/TransportSheet.tsx` (cohérence)

## Fichiers NON Modifiés

- `src/hooks/useMaconsByChantier.ts` ← **INTOUCHÉ**
- `src/pages/Index.tsx` ← **INTOUCHÉ**
- `src/pages/SignatureMacons.tsx` ← **INTOUCHÉ**
- `src/components/timesheet/TimeEntryTable.tsx` ← **INTOUCHÉ**
- `src/components/chef/ChefMaconsManager.tsx` ← **INTOUCHÉ**
- `src/components/conges/CongesSheet.tsx` ← **INTOUCHÉ**

## Conclusion

**Risque de régression : AUCUN**

La modification est :
- **Additive** : nouveau hook, pas de modification des hooks existants
- **Conditionnelle** : n'affecte que les chefs multi-chantier
- **Isolée** : uniquement dans les composants transport
- **Rétrocompatible** : le comportement par défaut reste identique

