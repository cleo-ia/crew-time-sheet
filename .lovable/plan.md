

# Plan : Ajout du sélecteur "Base horaire" (35h / 39h) dans les formulaires employés

## Objectif

Permettre de distinguer clairement si un salarié est sous contrat 35h ou 39h lors de la création/modification d'un Maçon, Grutier, Finisseur ou Chef.

---

## 1. Modification de la base de données

### Nouvelle colonne

| Table | Colonne | Type | Valeurs | Default |
|-------|---------|------|---------|---------|
| `utilisateurs` | `base_horaire` | `TEXT` | '35h', '39h' | NULL |

Cette colonne sera ajoutée à côté de `type_contrat` (CDI/CDD) et `horaire` (mensuel).

---

## 2. Modifications des formulaires

### Fichiers concernés

| Fichier | Composant |
|---------|-----------|
| `src/components/admin/MaconsManager.tsx` | Formulaire Maçon |
| `src/components/admin/ChefsManager.tsx` | Formulaire Chef |
| `src/components/admin/GrutiersManager.tsx` | Formulaire Grutier |
| `src/components/admin/FinisseursManager.tsx` | Formulaire Finisseur |

### Changements par formulaire

1. **Ajouter au `formData`** : `base_horaire: ""`
2. **Ajouter un Select** dans la section "Contrat de travail" :

```text
Section "Contrat de travail" :
┌──────────────────────┬──────────────────────┐
│ Type de contrat      │ Base horaire         │  ← NOUVEAU
│ [CDI ▼]              │ [35h / 39h ▼]        │
├──────────────────────┴──────────────────────┤
│ Horaire mensuel (heures)                     │
│ [151.67]                                     │
└──────────────────────────────────────────────┘
```

3. **Mettre à jour les fonctions** `handleSave`, `handleEdit` et le `reset` du formData

---

## 3. Hook useUtilisateurs

Le hook `useCreateUtilisateur` et `useUpdateUtilisateur` transmettent déjà tous les champs du `formData` vers Supabase. Aucune modification nécessaire si le champ `base_horaire` est ajouté au formData.

---

## Résumé des fichiers modifiés

| Fichier | Type de modification |
|---------|---------------------|
| **Migration SQL** | Ajout colonne `base_horaire` |
| `MaconsManager.tsx` | Ajout Select "Base horaire" |
| `ChefsManager.tsx` | Ajout Select "Base horaire" |
| `GrutiersManager.tsx` | Ajout Select "Base horaire" |
| `FinisseursManager.tsx` | Ajout Select "Base horaire" |

---

## Section technique

### Migration SQL

```sql
ALTER TABLE public.utilisateurs
ADD COLUMN IF NOT EXISTS base_horaire TEXT;

COMMENT ON COLUMN public.utilisateurs.base_horaire IS 'Base horaire du contrat: 35h ou 39h';
```

### Structure du Select

```text
Options :
- "" (placeholder: "Sélectionner")
- "35h" → Contrat 35 heures/semaine
- "39h" → Contrat 39 heures/semaine (4h supp structurelles)
```

### Positionnement dans le formulaire

Le nouveau sélecteur sera placé **à côté de "Type de contrat"** dans une grille 2 colonnes, permettant une saisie rapide et cohérente.

