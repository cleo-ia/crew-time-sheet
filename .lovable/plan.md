
# Plan : Grouper les finisseurs par chantier dans l'onglet "Mes heures" du conducteur

## Contexte

Le conducteur Jorge Goncalves gère deux équipes sans chef :
- Équipe sur **Les Arcs** (ex: 2 finisseurs)
- Équipe sur **Le Parc** (ex: 3 finisseurs)

Actuellement, tous les finisseurs apparaissent dans une liste unique sans distinction de chantier. Le conducteur ne peut pas facilement identifier qui travaille où.

## Solution proposée

Ajouter un **regroupement visuel par chantier** dans l'onglet "Mes heures" :
- Afficher des sections distinctes pour chaque chantier
- Chaque section affiche le nom du chantier en en-tête
- Les finisseurs sont groupés sous leur chantier respectif

## Analyse d'impact - Aucune régression

### Pourquoi aucune régression ?

1. **Fichier unique modifié** : Seul `ValidationConducteur.tsx` est modifié
2. **Données déjà disponibles** : `affectedDays` contient déjà le `chantier_id` par jour
3. **Logique métier inchangée** : 
   - `handleSaveAndSign` groupe déjà par chantier (lignes 341-367)
   - `SignatureFinisseurs` utilise déjà `chantier_id` pour les signatures
4. **Aucune modification de hooks** : Tous les hooks existants restent inchangés
5. **Modification purement visuelle** : Seul l'affichage change, pas les données

### Pages non impactées

| Page | Raison |
|------|--------|
| Index (Saisie hebdo) | Utilise `useAffectationsJoursByChefAndChantier` - non modifié |
| ChefMaconsManager | Utilise `useMaconsByChantier` - non modifié |
| SignatureMacons | Utilise `useMaconsByChantier` - non modifié |
| SignatureFinisseurs | Données déjà groupées par chantier - non modifié |
| FinisseursDispatchWeekly | Logique d'affectation - non modifié |
| PlanningMainOeuvre | Utilise ses propres hooks - non modifié |

## Modifications techniques

### Fichier : `src/pages/ValidationConducteur.tsx`

**Modification 1 : Ajouter le hook useChantiers (déjà importé)**

Vérification faite : `useChantiers` est déjà importé (ligne 27).

**Modification 2 : Charger les informations des chantiers (après ligne 198)**

```typescript
// Charger les chantiers pour afficher les noms
const { data: chantiers = [] } = useChantiers();
const chantiersMap = useMemo(() => {
  const map = new Map<string, { nom: string; code: string | null }>();
  chantiers.forEach(ch => {
    map.set(ch.id, { nom: ch.nom, code: ch.code_chantier });
  });
  return map;
}, [chantiers]);
```

**Modification 3 : Grouper les finisseurs par chantier (après ligne 221)**

```typescript
// Grouper les finisseurs par chantier pour l'affichage
const finisseursByChantier = useMemo(() => {
  const grouped = new Map<string, typeof finisseurs>();
  
  finisseurs.forEach(f => {
    // Déterminer le chantier principal (premier jour affecté)
    const chantierId = f.affectedDays?.[0]?.chantier_id || "sans-chantier";
    
    if (!grouped.has(chantierId)) {
      grouped.set(chantierId, []);
    }
    grouped.get(chantierId)!.push(f);
  });
  
  return grouped;
}, [finisseurs]);
```

**Modification 4 : Afficher par groupe de chantier (lignes 702-736)**

Remplacer l'affichage unique de `TimeEntryTable` par une boucle sur les chantiers :

```tsx
{Array.from(finisseursByChantier.entries()).map(([chantierId, chantierFinisseurs]) => {
  const chantierInfo = chantiersMap.get(chantierId);
  const chantierLabel = chantierInfo 
    ? `${chantierInfo.code || ""} - ${chantierInfo.nom}`.trim()
    : "Équipe sans chantier";
  
  return (
    <div key={chantierId} className="space-y-4">
      {finisseursByChantier.size > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-primary">{chantierLabel}</h3>
          <span className="text-sm text-muted-foreground">
            ({chantierFinisseurs.length} finisseur{chantierFinisseurs.length > 1 ? "s" : ""})
          </span>
        </div>
      )}
      <TimeEntryTable 
        chantierId={chantierId !== "sans-chantier" ? chantierId : null}
        weekId={selectedWeek}
        chefId={effectiveConducteurId}
        onEntriesChange={(entries) => {
          // Fusionner les entrées de ce chantier avec les autres
          setTimeEntries(prev => {
            const otherEntries = prev.filter(e => 
              !chantierFinisseurs.some(f => f.id === e.employeeId)
            );
            return [...otherEntries, ...entries];
          });
        }}
        mode="conducteur"
        affectationsJours={affectationsJours?.filter(a => 
          chantierFinisseurs.some(f => f.id === a.finisseur_id)
        )}
        allAffectations={allAffectationsEnriched}
      />
    </div>
  );
})}
```

## Résultat attendu

### Avant (actuel)
```
┌─────────────────────────────────────┐
│ Mes heures - S07                    │
├─────────────────────────────────────┤
│ • Jean DUPONT      39h              │
│ • Marie MARTIN     39h              │
│ • Pierre DURAND    39h              │
│ • Sophie BERNARD   39h              │
│ • Lucas PETIT      39h              │
└─────────────────────────────────────┘
```

### Après (avec regroupement)
```
┌─────────────────────────────────────┐
│ Mes heures - S07                    │
├─────────────────────────────────────┤
│ 📦 ARCS - Les Arcs (2 finisseurs)   │
│ ├─ Jean DUPONT      39h             │
│ └─ Marie MARTIN     39h             │
│                                     │
│ 📦 PARC - Le Parc (3 finisseurs)    │
│ ├─ Pierre DURAND    39h             │
│ ├─ Sophie BERNARD   39h             │
│ └─ Lucas PETIT      39h             │
└─────────────────────────────────────┘
```

## Tests à effectuer

1. **Conducteur avec 2+ chantiers** : Vérifier que les en-têtes de chantier apparaissent
2. **Conducteur avec 1 seul chantier** : Vérifier que l'en-tête n'apparaît pas (inutile)
3. **Sauvegarde multi-chantiers** : Vérifier que les heures sont correctement sauvegardées par chantier
4. **Signature** : Vérifier que le processus de signature fonctionne toujours
5. **Page Index (Saisie chef)** : Vérifier qu'elle fonctionne toujours normalement
6. **ChefMaconsManager** : Vérifier qu'il fonctionne toujours normalement
