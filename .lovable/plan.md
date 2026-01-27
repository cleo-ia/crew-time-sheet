

# Correction du role_metier pour les intérimaires

## Contexte

L'analyse révèle que **TOUS les intérimaires** (21 utilisateurs) ont `role_metier = NULL`. Cela crée une incohérence car :
- Ils sont filtrés par `agence_interim` (logique actuelle)
- Mais ils n'ont pas de `role_metier` explicite
- Cela peut causer des confusions dans certaines vues ou requêtes futures

## Modifications à effectuer

### 1. Nettoyage des données existantes (Migration SQL)

Mise à jour du `role_metier` pour tous les intérimaires existants :

```sql
-- Mettre à jour tous les intérimaires existants avec role_metier = 'interimaire'
UPDATE utilisateurs 
SET role_metier = 'interimaire', updated_at = now()
WHERE agence_interim IS NOT NULL 
  AND agence_interim != ''
  AND (role_metier IS NULL OR role_metier != 'interimaire');
```

### 2. Ajout de 'interimaire' au type role_metier

Le type `role_metier` dans la table utilisateurs doit être étendu pour accepter la valeur `'interimaire'` :

```sql
-- Vérifier si la colonne role_metier accepte 'interimaire' et l'ajouter si nécessaire
ALTER TABLE utilisateurs 
  DROP CONSTRAINT IF EXISTS utilisateurs_role_metier_check;

-- Note: Si role_metier est un type TEXT sans contrainte, pas de modification nécessaire
```

### 3. Modification du InterimaireFormDialog

Ajout automatique de `role_metier: 'interimaire'` lors de la création :

```typescript
// InterimaireFormDialog.tsx - ligne 65-68
const result = await createUtilisateur.mutateAsync({
  ...formData,
  role_metier: 'interimaire',  // NOUVEAU: toujours définir le role_metier
});
```

### 4. Mise à jour du type TypeScript

Ajout de `'interimaire'` aux valeurs possibles du type :

```typescript
// useUtilisateurs.ts - ligne 14
role_metier?: 'macon' | 'finisseur' | 'grutier' | 'chef' | 'conducteur' | 'interimaire' | null;
```

## Résultat attendu

| Avant | Après |
|-------|-------|
| Intérimaires identifiés par `agence_interim` seul | Intérimaires identifiés par `agence_interim` ET `role_metier = 'interimaire'` |
| 21 intérimaires sans `role_metier` | 21 intérimaires avec `role_metier = 'interimaire'` |
| Incohérence potentielle | Cohérence totale avec les autres rôles |

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Update des intérimaires existants |
| src/components/shared/InterimaireFormDialog.tsx | Ajout de `role_metier: 'interimaire'` à la création |
| src/hooks/useUtilisateurs.ts | Ajout de `'interimaire'` au type TypeScript |

## Récapitulatif de la protection complète

Après cette correction, **tous les rôles terrain** auront leur `role_metier` correctement défini :

| Rôle | Création via | role_metier défini par |
|------|--------------|----------------------|
| Chef | ChefsManager.tsx | `role_metier: 'chef'` |
| Conducteur | ConducteursManager.tsx | `role_metier: 'conducteur'` |
| Maçon | MaconsManager.tsx | `role_metier: 'macon'` |
| Finisseur | FinisseursManager.tsx | `role_metier: 'finisseur'` |
| Grutier | GrutiersManager.tsx | `role_metier: 'grutier'` |
| Intérimaire | InterimaireFormDialog.tsx | `role_metier: 'interimaire'` (NOUVEAU) |
| Via invitation | Trigger handle_new_user_signup | Mapping automatique selon le rôle d'invitation |

