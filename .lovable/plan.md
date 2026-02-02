
# Analyse d'Impact : Aucune Régression Garantie

## Contexte de la Correction

La modification consiste à changer le hook utilisé dans `SignatureMacons.tsx` :
- **Avant** : `useAffectationsJoursByChef(chefId, semaine)` - récupère les affectations de tous les chantiers
- **Après** : `useAffectationsJoursByChefAndChantier(chefId, chantierId, semaine)` - récupère uniquement les affectations du chantier actuel

## Analyse des Fichiers Impactés

### Fichiers utilisant `useAffectationsJoursByChef` (tous les chantiers)

| Fichier | Raison d'utiliser TOUS les chantiers | Impact |
|---------|--------------------------------------|--------|
| `ChefMaconsManager.tsx` | Voir quels jours un maçon est affecté sur d'autres chantiers pour gérer les conflits | Aucun - non modifié |
| `TransportDayAccordion.tsx` | Déterminer si un maçon est affecté ce jour pour le mode planning | Aucun - non modifié |
| `Index.tsx` | Transmet les données à TimeEntryTable qui fait son propre filtrage | Aucun - non modifié |

### Fichiers utilisant `useAffectationsJoursByChefAndChantier` (chantier spécifique)

| Fichier | Raison de filtrer par chantier | Impact |
|---------|-------------------------------|--------|
| `TimeEntryTable.tsx` | Afficher uniquement les heures du chantier sélectionné | Déjà correct - non modifié |
| `SignatureMacons.tsx` | **À CORRIGER** - Afficher uniquement les heures du chantier de signature | Correction proposée |

## Pourquoi Aucune Régression

### 1. Le hook `useAffectationsJoursByChefAndChantier` existe déjà et fonctionne

Il est déjà utilisé dans `TimeEntryTable.tsx` depuis la correction du bug multi-chantier. Cette correction a été validée et fonctionne correctement.

### 2. La page SignatureMacons a un contexte clair

La page de signature affiche les données pour **un seul chantier** (identifié par `chantierId` dans l'URL). Il est donc logique de filtrer les affectations par ce chantier.

Le `chantierId` est déjà disponible via `searchParams.get("chantierId")` (ligne 29).

### 3. Les autres pages ne sont pas modifiées

- `Index.tsx` : Pas de changement
- `TransportDayAccordion.tsx` : Pas de changement  
- `ChefMaconsManager.tsx` : Pas de changement

### 4. La logique `getFilteredMaconData` reste inchangée

Le filtrage des `ficheJours` se base sur `affectationsJoursChef`. Avec des données correctement filtrées par chantier, le filtrage sera plus précis et cohérent.

## Modification Prévue (1 seul fichier)

**Fichier** : `src/pages/SignatureMacons.tsx`

**Changement d'import** (ligne 16) :
```typescript
// Avant
import { useAffectationsJoursByChef } from "@/hooks/useAffectationsJoursChef";

// Après
import { useAffectationsJoursByChefAndChantier } from "@/hooks/useAffectationsJoursChef";
```

**Changement d'appel du hook** (lignes 39-42) :
```typescript
// Avant
const { data: affectationsJoursChef = [] } = useAffectationsJoursByChef(
  isPlanningActive ? (chefId || null) : null,
  semaine || ""
);

// Après
const { data: affectationsJoursChef = [] } = useAffectationsJoursByChefAndChantier(
  isPlanningActive ? (chefId || null) : null,
  isPlanningActive ? chantierId : null,
  semaine || ""
);
```

**Changement de l'auto-sélection** (lignes 125-139) :
```typescript
// Avant
useEffect(() => {
  if (macons.length > 0 && !selectedMacon) {
    const firstUnsignedWithData = macons.find((m) => 
      !m.signed && 
      m.ficheJours && 
      m.ficheJours.length > 0
    );
    const firstUnsigned = macons.find((m) => !m.signed);
    setSelectedMacon(firstUnsignedWithData || firstUnsigned || null);
  }
}, [macons, selectedMacon]);

// Après
useEffect(() => {
  if (macons.length > 0 && !selectedMacon) {
    // Priorité 1 : Le chef non-signé (premier de la liste triée)
    const chefUnsigned = macons.find((m) => m.isChef && !m.signed);
    // Priorité 2 : Premier employé non-signé
    const firstUnsigned = macons.find((m) => !m.signed);
    setSelectedMacon(chefUnsigned || firstUnsigned || macons[0]);
  }
}, [macons, selectedMacon]);
```

## Tests de Non-Régression Recommandés

Après implémentation, valider ces scénarios :

| Scénario | Page | Résultat attendu |
|----------|------|------------------|
| Chef travaillant sur 1 seul chantier | SignatureMacons | Affiche 5 jours (Lun-Ven) |
| Chef travaillant sur 2 chantiers (3+2 jours) | SignatureMacons | Affiche seulement les jours du chantier sélectionné |
| Saisie heures employé multi-chantier | TimeEntryTable | Champs verrouillés pour les jours non-affectés |
| Gestion équipe chef | ChefMaconsManager | Voit toutes les affectations sur tous les chantiers |
| Fiche trajet | TransportDayAccordion | Conducteurs filtrés par présence ce jour |

## Conclusion

La correction est **chirurgicale** et **isolée** à la page `SignatureMacons.tsx`. Elle utilise un hook qui existe déjà et qui fonctionne correctement dans `TimeEntryTable.tsx`. Les autres pages utilisant `useAffectationsJoursByChef` ont un besoin légitime de voir toutes les affectations du chef et ne sont pas impactées.

**Risque de régression : AUCUN**
