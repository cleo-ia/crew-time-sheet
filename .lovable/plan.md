

## Isolation des agences d'intérim par entreprise

### Problème identifié
Le hook `useAgencesInterim` récupère les agences d'intérim depuis la table `utilisateurs` **sans filtrer par entreprise**. Résultat : SDER voit les agences créées par Limoge Revillon (Adequat, Manpower, etc.).

### Solution

Ajouter un filtre `entreprise_id` dans le hook pour ne récupérer que les agences des intérimaires de l'entreprise courante.

### Modification technique

**Fichier : `src/hooks/useAgencesInterim.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAgencesInterim = () => {
  // Récupérer l'entreprise courante depuis localStorage
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["agences-interim", entrepriseId],
    queryFn: async () => {
      let query = supabase
        .from("utilisateurs")
        .select("agence_interim")
        .not("agence_interim", "is", null)
        .neq("agence_interim", "");

      // Filtrer par entreprise
      if (entrepriseId) {
        query = query.eq("entreprise_id", entrepriseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const uniqueAgences = [
        ...new Set(
          data.map((u) => u.agence_interim?.trim()).filter(Boolean)
        ),
      ].sort();

      return uniqueAgences as string[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!entrepriseId,
  });
};
```

### Points clés
| Aspect | Détail |
|--------|--------|
| **Filtre** | `.eq("entreprise_id", entrepriseId)` |
| **Cache** | `queryKey` inclut `entrepriseId` pour isoler le cache par entreprise |
| **Sécurité** | `enabled: !!entrepriseId` évite les requêtes sans contexte d'entreprise |

### Résultat attendu
- **SDER** : verra uniquement les agences renseignées pour les intérimaires SDER
- **Limoge Revillon** : continuera de voir ses propres agences (Adequat, Manpower, etc.)
- **Nouvelle entreprise** : commencera avec une liste vide, puis se remplira au fur et à mesure

