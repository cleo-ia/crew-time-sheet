

## Plan: Instrumentation des créations/suppressions (Intérimaires + Véhicules)

### Fichiers modifiés

**1. `src/components/shared/InterimaireFormDialog.tsx`**
- Importer `useLogModification` et `useCurrentUserInfo`
- Après création réussie : appeler `logModification.mutate` avec `action: 'creation_interimaire'` et `details: { message: "Ajout de l'intérimaire [Nom] [Prénom] (Agence: [Agence])" }`

**2. `src/components/admin/InterimairesManager.tsx`**
- Importer `useLogModification` et `useCurrentUserInfo`
- Avant/après suppression réussie : appeler `logModification.mutate` avec `action: 'suppression_interimaire'` et `details: { message: "Suppression définitive de l'intérimaire [Nom] [Prénom]" }`

**3. `src/components/admin/VehiculesManager.tsx`**
- Importer `useLogModification` et `useCurrentUserInfo`
- Après création réussie dans `handleSubmit` : `action: 'creation_vehicule'`, `details: { message: "Ajout du véhicule [Marque/Modèle] - Immatriculation: [Plaque]" }`
- Après suppression réussie dans `handleDelete` : `action: 'suppression_vehicule'`, `details: { message: "Retrait du véhicule [Marque/Modèle] ([Plaque])" }` (stocker les infos du véhicule avant suppression)

**4. `src/components/shared/ModificationHistoryTable.tsx`**
- Ajouter 4 entrées dans `ACTION_CONFIG` :
  - `creation_interimaire: { label: "Création intérimaire", variant: "default" }`
  - `suppression_interimaire: { label: "Suppression intérimaire", variant: "destructive" }`
  - `creation_vehicule: { label: "Création véhicule", variant: "default" }`
  - `suppression_vehicule: { label: "Suppression véhicule", variant: "destructive" }`
- Le fallback `details.message` est **déjà géré** (ligne 167-169), donc si `champ_modifie` est vide, le message dans `details` s'affiche automatiquement.

### Points techniques
- On utilise `useCurrentUserInfo()` pour obtenir `userId`, `userName`, `entrepriseId` (pattern existant)
- On utilise `useCurrentUserRole()` pour passer `userRole` au log
- `fiche_id` sera `null` car ces actions ne concernent pas une fiche
- Aucune migration DB nécessaire — la table `fiches_modifications` accepte déjà ces champs

