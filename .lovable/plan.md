
# Plan : Chefs multi-chantiers avec contrainte de saisie sur le principal

## Résumé du besoin

### Règles métier à respecter

| Rôle | Planning (conducteur) | Saisie heures (chef) |
|------|----------------------|---------------------|
| **Chef** | Peut être sur **plusieurs chantiers** le même jour | Voit/gère **tous** ses chantiers, mais saisit ses **heures propres uniquement sur son principal** |
| **Maçon/Grutier/Finisseur/Intérimaire** | **Un seul chantier** par jour | N/A |

### Problème actuel

1. La contrainte `UNIQUE(employe_id, jour, entreprise_id)` sur `planning_affectations` empêche tout employé d'avoir plusieurs affectations le même jour
2. L'`upsert` avec `onConflict: "employe_id,jour,entreprise_id"` **écrase** l'affectation existante au lieu d'en créer une nouvelle
3. Résultat : quand on ajoute FAY Philippe sur un 2ème chantier, il disparaît du 1er

## Architecture de la solution

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        BASE DE DONNÉES                              │
├─────────────────────────────────────────────────────────────────────┤
│  Contrainte : UNIQUE(employe_id, jour, chantier_id, entreprise_id)  │
│  → Permet plusieurs affectations par jour sur différents chantiers │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTRÔLE UI (déjà en place)                      │
├─────────────────────────────────────────────────────────────────────┤
│  AddEmployeeToPlanningDialog.tsx :                                  │
│  - Chefs : jours NON bloqués → multi-chantiers autorisé            │
│  - Maçons/Finisseurs/Grutiers/Intérimaires : jours BLOQUÉS         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SAISIE HEBDOMADAIRE                              │
├─────────────────────────────────────────────────────────────────────┤
│  ChantierSelector.tsx :                                             │
│  - Affiche TOUS les chantiers où le chef est affecté (planning)    │
│  - + les chantiers où chef_id = lui (rétrocompatibilité)           │
│                                                                     │
│  TimeEntryTable.tsx :                                               │
│  - Chef peut gérer ses équipes sur TOUS ses chantiers              │
│  - Chef ne peut saisir SES heures QUE sur son chantier_principal   │
└─────────────────────────────────────────────────────────────────────┘
```

## Fichiers à modifier

| Fichier | Type | Modification |
|---------|------|--------------|
| **Migration SQL** | Database | Modifier la contrainte d'unicité |
| `src/hooks/usePlanningAffectations.ts` | Hook | Changer `onConflict` (ligne 104) |
| `src/components/timesheet/ChantierSelector.tsx` | UI | Récupérer les chantiers depuis le planning |
| `src/components/timesheet/TimeEntryTable.tsx` | UI | Bloquer la saisie des heures du chef hors principal |

## Détails d'implémentation

### 1. Migration SQL (à exécuter dans Supabase)

```sql
-- Supprimer l'ancienne contrainte
ALTER TABLE planning_affectations 
DROP CONSTRAINT IF EXISTS unique_employe_jour_entreprise;

-- Créer la nouvelle contrainte incluant chantier_id
ALTER TABLE planning_affectations 
ADD CONSTRAINT unique_employe_jour_chantier_entreprise 
UNIQUE (employe_id, jour, chantier_id, entreprise_id);
```

### 2. Modification du hook usePlanningAffectations.ts

**Ligne 104** - Changer le paramètre `onConflict` :

```typescript
// Avant
onConflict: "employe_id,jour,entreprise_id",

// Après
onConflict: "employe_id,jour,chantier_id,entreprise_id",
```

### 3. Modification du ChantierSelector.tsx

Ajouter un paramètre `semaine` pour récupérer les chantiers depuis le planning en plus de la requête actuelle :

```typescript
interface ChantierSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  chefId?: string;
  conducteurId?: string;
  compact?: boolean;
  allowAll?: boolean;
  disabled?: boolean;
  semaine?: string; // NOUVEAU: pour récupérer les chantiers du planning
}

// Dans la query, fusionner :
// 1. Chantiers où chef_id = chefId (actuel)
// 2. Chantiers du planning pour cette semaine (NOUVEAU)
```

### 4. Modification du TimeEntryTable.tsx

Ajouter une vérification pour bloquer la saisie des heures du chef hors de son chantier principal :

```typescript
// Récupérer le chantier_principal_id du chef connecté
const { data: chefInfo } = useQuery({
  queryKey: ["chef-principal", selectedChef],
  queryFn: async () => {
    const { data } = await supabase
      .from("utilisateurs")
      .select("chantier_principal_id")
      .eq("id", selectedChef)
      .single();
    return data;
  },
  enabled: !!selectedChef,
});

// Dans le rendu des heures du chef lui-même :
const isChefOnSecondary = selectedChef && 
  chefInfo?.chantier_principal_id && 
  chefInfo.chantier_principal_id !== chantierId;

// Si le chef est sur un chantier secondaire, afficher ses heures en lecture seule
// avec un message explicatif
```

## Comportement après modification

| Scénario | Résultat |
|----------|----------|
| **Conducteur** ajoute FAY sur chantier A (L-V) | 5 affectations créées, badge "Principal ★" |
| **Conducteur** ajoute FAY sur chantier B (L-V) | 5 **nouvelles** affectations, badge "Secondaire" |
| FAY visible sur les 2 chantiers | ✅ Affichage correct |
| **Maçon** déjà sur A, ajout sur B | ❌ Jours grisés (bloqué par UI) |
| **FAY** dans saisie : sélecteur chantiers | Voit A et B |
| **FAY** gère équipe sur B | ✅ Peut ajouter/modifier employés |
| **FAY** saisit SES heures sur B | ❌ Bloqué avec message "Saisie sur votre principal uniquement" |
| **FAY** saisit SES heures sur A | ✅ Normal |

## Sécurité et intégrité

1. **Contrainte DB** : Empêche les doublons (même employé, même jour, même chantier)
2. **Contrôle UI** : Bloque les maçons/finisseurs/grutiers/intérimaires d'être multi-chantiers
3. **Protection heures** : Le chef ne peut pas créer de doublons d'heures pour lui-même
4. **Multi-tenant** : La contrainte inclut `entreprise_id` pour l'isolation des données

## Résumé des changements

```text
1. ✅ Migration SQL exécutée
   └─ DROP + ADD CONSTRAINT avec chantier_id inclus

2. ✅ src/hooks/usePlanningAffectations.ts
   └─ Ligne 104 : onConflict avec chantier_id

3. ✅ src/components/timesheet/ChantierSelector.tsx
   └─ Ajouter paramètre semaine
   └─ Fusionner chantiers chef_id + chantiers planning

4. ✅ src/components/timesheet/TimeEntryTable.tsx
   └─ Récupérer chantier_principal_id du chef
   └─ Bloquer saisie heures propres hors principal
   └─ Message explicatif pour le chef sur chantier secondaire

5. ✅ src/pages/Index.tsx
   └─ Passer semaine={selectedWeek} au ChantierSelector
```

## Statut : ✅ IMPLÉMENTÉ
