

## Sécurisation du filtrage entreprise_id dans useInventoryTemplates

### Problème
La requête `useInventoryTemplates` fait un `select("*")` sans filtre explicite par `entreprise_id`. Bien que la RLS filtre deja cote serveur, ajouter un filtre explicite cote client est une bonne pratique defensive et aide au debug.

### Changements

**Fichier : `src/hooks/useInventoryTemplates.ts`**

1. Recuperer `current_entreprise_id` depuis localStorage dans la queryFn
2. Ajouter `.eq("entreprise_id", entrepriseId)` a la requete SELECT
3. Ajouter un `console.log("Templates charges :", data)` apres la requete pour debug
4. Ajouter `entrepriseId` dans la `queryKey` pour invalider le cache si l'entreprise change

Aucune modification de schema ni de RLS necessaire — les policies sont deja correctes.

### Risque
Aucun — filtre additif sur une requete deja protegee par RLS.

