

# Plan : Gestion des Chefs Multi-Chantiers sans Doublon d'Heures

## Contexte

Deux chefs sont actuellement affectés sur plusieurs chantiers :
- **Sébastien Bouillet** : MAILLARD + DAVOULT
- **Giovanni Dorazio** : CREUSOT VILET + CREUSOT HENRI

Le système actuel crée des fiches distinctes pour chaque chantier, générant des doublons d'heures (78h au lieu de 39h par semaine pour Sébastien).

## Solution en 3 volets

### Volet 1 : Modification du schéma de données

Ajouter une colonne `chantier_principal_id` dans la table `utilisateurs` pour identifier le chantier principal d'un chef multi-chantiers.

```text
ALTER TABLE utilisateurs
ADD COLUMN chantier_principal_id UUID REFERENCES chantiers(id);
```

Cette colonne sera :
- `NULL` pour les employés non-chefs ou chefs mono-chantier
- Renseignée automatiquement lors de la première affectation sur le planning

### Volet 2 : Modification de la synchronisation

Modifier `supabase/functions/sync-planning-to-teams/index.ts` pour :

1. **Détecter les chefs multi-chantiers** via `chantiers.chef_id`
2. **Identifier le chantier principal** :
   - Si `utilisateurs.chantier_principal_id` est défini, l'utiliser
   - Sinon, prendre le premier chantier assigné dans le planning pour cette semaine
3. **Créer les fiches intelligemment** :
   - Sur le chantier principal : créer la fiche personnelle du chef avec ses heures
   - Sur les chantiers secondaires : créer uniquement les fiches de l'équipe (membres), sans les heures du chef

```text
Logique simplifiée :
┌─────────────────────────────────────────────────────────────────────┐
│  Pour chaque couple (employé, chantier) dans le planning :         │
│                                                                     │
│  1. Est-ce un chef (apparait dans chantiers.chef_id) ?             │
│     └─ OUI → Vérifier si c'est son chantier principal              │
│              └─ SI principal : créer fiche + fiches_jours          │
│              └─ SI secondaire : SKIP (pas de fiche personnelle)    │
│     └─ NON → Créer normalement                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Volet 3 : Indication visuelle dans le Planning

Modifier `src/components/planning/PlanningEmployeRow.tsx` et `PlanningChantierAccordion.tsx` pour :

1. **Afficher un badge "Principal"** à côté du nom du chef sur son chantier principal
2. **Afficher un badge "Secondaire"** sur les autres chantiers
3. **Permettre au conducteur de changer le chantier principal** via un menu contextuel

```text
Exemple visuel dans le planning :

MAILLARD - 16200 Sébastien Bouillet (chef)
├── BOUILLET Sébastien [Chef] [★ Principal] L M M J V
└── MARTIN Paul [Maçon] L M M J V

DAVOULT - 21000 Dijon
├── BOUILLET Sébastien [Chef] [Secondaire] L M M J V ← Heures non comptées
└── DURAND Marie [Maçon] L M M J V
```

### Volet 4 : Script de nettoyage des doublons historiques

Créer un script SQL pour :
1. Identifier les fiches en doublon (chef multi-chantiers, même semaine, statut ENVOYE_RH)
2. Conserver la fiche du chantier principal
3. Supprimer les fiches secondaires (avec leurs fiches_jours associées)

```text
Fiches à nettoyer :
┌─────────────────┬──────────┬──────────────┬─────────┬────────┐
│ Nom             │ Semaine  │ Chantier     │ Statut  │ Action │
├─────────────────┼──────────┼──────────────┼─────────┼────────┤
│ BOUILLET S.     │ 2026-S04 │ MAILLARD     │ ENVOYE  │ GARDER │
│ BOUILLET S.     │ 2026-S04 │ DAVOULT      │ ENVOYE  │ DELETE │
│ BOUILLET S.     │ 2026-S05 │ MAILLARD     │ ENVOYE  │ GARDER │
│ BOUILLET S.     │ 2026-S05 │ DAVOULT      │ ENVOYE  │ DELETE │
│ BOUILLET S.     │ 2026-S06 │ MAILLARD     │ BROUIL  │ GARDER │
│ BOUILLET S.     │ 2026-S06 │ DAVOULT      │ BROUIL  │ DELETE │
│ DORAZIO G.      │ 2026-S05 │ VILET        │ ENVOYE  │ GARDER │
│ DORAZIO G.      │ 2026-S05 │ HENRI        │ BROUIL  │ DELETE │
└─────────────────┴──────────┴──────────────┴─────────┴────────┘
```

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `supabase/migrations/xxx_add_chantier_principal.sql` | Ajouter colonne `chantier_principal_id` |
| `supabase/functions/sync-planning-to-teams/index.ts` | Logique de skip pour chefs secondaires |
| `src/components/planning/PlanningEmployeRow.tsx` | Badge "Principal" / "Secondaire" |
| `src/components/planning/PlanningChantierAccordion.tsx` | Menu pour changer le chantier principal |
| `src/hooks/usePlanningAffectations.ts` | Mutation pour setter le chantier principal |
| `src/integrations/supabase/types.ts` | Régénérer les types (colonne ajoutée) |
| `cleanup-doublons-chefs.sql` | Script SQL de nettoyage |

## Détails techniques

### Migration SQL

```sql
-- 1. Ajouter la colonne
ALTER TABLE utilisateurs
ADD COLUMN chantier_principal_id UUID REFERENCES chantiers(id);

-- 2. Initialiser pour les chefs existants (premier chantier actif trouvé)
UPDATE utilisateurs u
SET chantier_principal_id = (
  SELECT c.id 
  FROM chantiers c 
  WHERE c.chef_id = u.id AND c.actif = true
  ORDER BY c.created_at ASC
  LIMIT 1
)
WHERE u.id IN (
  SELECT DISTINCT chef_id FROM chantiers WHERE chef_id IS NOT NULL AND actif = true
);

-- 3. Index pour les performances
CREATE INDEX idx_utilisateurs_chantier_principal ON utilisateurs(chantier_principal_id);
```

### Modification sync-planning-to-teams (lignes 275-340)

```typescript
// Avant le traitement de chaque couple employé-chantier

// 1. Construire la map des chefs avec leur chantier principal
const chefPrincipalMap = new Map<string, string>(); // chef_id -> chantier_principal_id

// Récupérer les chefs avec leur chantier principal depuis utilisateurs
const { data: chefsData } = await supabase
  .from('utilisateurs')
  .select('id, chantier_principal_id')
  .not('chantier_principal_id', 'is', null);

for (const chef of chefsData || []) {
  chefPrincipalMap.set(chef.id, chef.chantier_principal_id);
}

// Dans la boucle principale (ligne ~287)
for (const [key, affectations] of planningByEmployeChantier) {
  const [employeId, chantierId] = key.split('|');
  
  // NOUVEAU : Vérifier si c'est un chef sur un chantier secondaire
  const chantierPrincipal = chefPrincipalMap.get(employeId);
  if (chantierPrincipal && chantierId !== chantierPrincipal) {
    // C'est un chef sur un chantier secondaire → skip la création de SA fiche
    // Mais on crée quand même les affectations_jours_chef pour l'équipe
    console.log(`[sync] Chef ${employeId} sur chantier secondaire ${chantierId}, skip fiche personnelle`);
    results.push({ 
      employe_id: employeId, 
      employe_nom: employeNom, 
      action: 'skipped', 
      details: `Chef - heures sur chantier principal` 
    });
    
    // Créer les affectations_jours_chef UNIQUEMENT pour router l'équipe
    // Ne PAS créer de fiche/fiches_jours pour le chef lui-même
    continue;
  }
  
  // ... reste du code existant (copie ou création de fiche)
}
```

### Hook pour setter le chantier principal

```typescript
// Dans usePlanningAffectations.ts
export const useSetChantierPrincipal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ employeId, chantierId }: { employeId: string; chantierId: string }) => {
      const { error } = await supabase
        .from('utilisateurs')
        .update({ chantier_principal_id: chantierId })
        .eq('id', employeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-affectations'] });
    }
  });
};
```

### Indication visuelle (PlanningEmployeRow)

```typescript
// Nouvelle prop pour indiquer si c'est le chantier principal
interface PlanningEmployeRowProps {
  // ... props existantes
  isChantierPrincipal?: boolean; // true si c'est le chantier principal du chef
  isChef?: boolean; // true si l'employé est un chef
}

// Dans le rendu
{isChef && (
  <Badge 
    variant="outline" 
    className={cn(
      "text-xs px-1.5",
      isChantierPrincipal 
        ? "bg-amber-50 text-amber-700 border-amber-300" 
        : "bg-gray-50 text-gray-500 border-gray-300"
    )}
  >
    {isChantierPrincipal ? "★ Principal" : "Secondaire"}
  </Badge>
)}
```

## Script de nettoyage

```sql
-- Script: cleanup-doublons-chefs.sql

-- 1. Identifier les chefs avec leur chantier principal
WITH chefs_principaux AS (
  SELECT 
    u.id as chef_id,
    u.chantier_principal_id,
    c.nom as chantier_principal_nom
  FROM utilisateurs u
  INNER JOIN chantiers c ON c.id = u.chantier_principal_id
  WHERE u.chantier_principal_id IS NOT NULL
),

-- 2. Identifier les fiches en doublon (même chef, même semaine, chantier différent du principal)
fiches_a_supprimer AS (
  SELECT f.id as fiche_id, f.salarie_id, f.semaine, f.chantier_id, c.nom as chantier_nom
  FROM fiches f
  INNER JOIN chefs_principaux cp ON f.salarie_id = cp.chef_id
  INNER JOIN chantiers c ON f.chantier_id = c.id
  WHERE f.chantier_id != cp.chantier_principal_id
    AND f.statut IN ('BROUILLON', 'ENVOYE_RH', 'AUTO_VALIDE')
)

-- 3. Supprimer les fiches_jours associées
DELETE FROM fiches_jours WHERE fiche_id IN (SELECT fiche_id FROM fiches_a_supprimer);

-- 4. Supprimer les fiches secondaires
DELETE FROM fiches WHERE id IN (SELECT fiche_id FROM fiches_a_supprimer);

-- 5. Vérification
SELECT 
  u.nom, u.prenom, 
  COUNT(f.id) as nb_fiches,
  f.semaine
FROM fiches f
INNER JOIN utilisateurs u ON f.salarie_id = u.id
WHERE f.salarie_id IN (SELECT chef_id FROM chefs_principaux)
GROUP BY u.nom, u.prenom, f.semaine
HAVING COUNT(f.id) > 1;
-- Doit retourner 0 lignes après nettoyage
```

## Impact sur le flux

| Etape | Avant | Après |
|-------|-------|-------|
| Planning S+1 | Chef planifié sur 2 chantiers = 2 fiches x 39h | Chef planifié sur 2 chantiers = 1 fiche x 39h (principal uniquement) |
| Sync Teams | 78h stockées en base | 39h stockées en base |
| Saisie Chef | Peut modifier ses heures depuis les 2 chantiers | Ses heures sont uniquement modifiables depuis le principal |
| Équipe | Membres ont leurs fiches sur chaque chantier | Inchangé |
| RH | Déduplication → 39h affichées (mais 78h en base) | 39h stockées = 39h affichées (cohérent) |

## Ordre d'implémentation

1. **Migration SQL** : Ajouter la colonne et initialiser
2. **Types** : Régénérer les types Supabase
3. **sync-planning-to-teams** : Implémenter la logique de skip
4. **UI Planning** : Badges + menu pour changer le principal
5. **Script nettoyage** : Exécuter manuellement après déploiement
6. **Test complet** : Valider le flux sur Sébastien Bouillet

