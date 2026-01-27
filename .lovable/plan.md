
# Correction : Empêcher les doublons d'utilisateurs

## Problème identifié

La table `utilisateurs` ne possède aucune contrainte d'unicité. Cela permet de créer plusieurs fois le même utilisateur (même nom + prénom) au sein de la même entreprise.

**Exemple concret :**
- "Ahmed Bhagdadi" existe 3 fois (créé en 1 minute d'intervalle le 25/11/2025)
- "David Chetail" existe 3 fois (créé en 2 minutes d'intervalle le 05/12/2025)

## Solution en 2 parties

### Partie 1 : Contrainte de base de données

Ajouter une contrainte d'unicité au niveau de la base de données pour empêcher les doublons à la source.

```sql
-- Contrainte unique sur nom + prénom + entreprise_id (insensible à la casse)
CREATE UNIQUE INDEX idx_utilisateurs_unique_nom_prenom_entreprise 
ON public.utilisateurs (
  LOWER(TRIM(nom)), 
  LOWER(TRIM(prenom)), 
  entreprise_id
);
```

Cette approche :
- Bloque les doublons au niveau base de données
- Est insensible à la casse ("Bhagdadi" = "bhagdadi" = "BHAGDADI")
- Ignore les espaces en début/fin de chaîne
- Fonctionne pour toutes les entreprises indépendamment

### Partie 2 : Vérification frontend (UX améliorée)

Modifier le hook `useCreateUtilisateur` pour vérifier l'existence avant l'insertion et proposer une meilleure expérience utilisateur.

**Fichier : `src/hooks/useUtilisateurs.ts`**

```typescript
export const useCreateUtilisateur = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: { ... }) => {
      const entrepriseId = await getCurrentEntrepriseId();

      // NOUVEAU : Vérifier si un utilisateur avec le même nom/prénom existe déjà
      const { data: existing, error: checkError } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, role_metier, agence_interim")
        .eq("entreprise_id", entrepriseId)
        .ilike("nom", user.nom.trim())
        .ilike("prenom", user.prenom.trim())
        .limit(1);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        const existingUser = existing[0];
        const details = existingUser.role_metier 
          ? `(${existingUser.role_metier})`
          : existingUser.agence_interim 
            ? `(intérimaire - ${existingUser.agence_interim})`
            : "";
        throw new Error(
          `Un utilisateur "${existingUser.prenom} ${existingUser.nom}" ${details} existe déjà. ` +
          `Utilisez la fonction de modification ou vérifiez le nom saisi.`
        );
      }

      // Suite du code existant...
      const { data: utilisateur, error: userError } = await supabase
        .from("utilisateurs")
        .insert({ ... })
        .select()
        .single();
      
      if (userError) throw userError;
      return utilisateur;
    },
    // ...
  });
};
```

### Partie 3 : Nettoyage des doublons existants

Script SQL à exécuter manuellement pour supprimer les doublons :

```sql
-- Identifier les doublons
WITH duplicates AS (
  SELECT 
    id,
    nom,
    prenom,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(nom)), LOWER(TRIM(prenom)), entreprise_id 
      ORDER BY created_at ASC
    ) as rn
  FROM public.utilisateurs
)
SELECT * FROM duplicates WHERE rn > 1;

-- Après vérification, supprimer les doublons (garder le premier créé)
DELETE FROM public.utilisateurs
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(nom)), LOWER(TRIM(prenom)), entreprise_id 
        ORDER BY created_at ASC
      ) as rn
    FROM public.utilisateurs
  ) t WHERE rn > 1
);
```

## Résumé des modifications

| Élément | Action |
|---------|--------|
| Migration SQL | Créer index unique sur `(nom, prenom, entreprise_id)` |
| `useUtilisateurs.ts` | Ajouter vérification d'existence avant création |
| Données existantes | Script de nettoyage manuel des 6 doublons |

## Comportement après correction

| Action | Avant | Après |
|--------|-------|-------|
| Créer "Ahmed Bhagdadi" 2 fois | Création silencieuse | Erreur "existe déjà" avec détails |
| Double-clic rapide sur "Créer" | 2 entrées créées | 1 seule entrée (contrainte DB) |
| Même nom via différents managers | Doublons possibles | Bloqué (contrainte globale) |

## Note importante

Le nettoyage des doublons existants doit être fait **avant** d'ajouter la contrainte d'unicité, sinon la migration échouera à cause des violations de contrainte existantes.
