

## Plan : Ajouter un onglet "Intérimaires" à la page Rapprochement Intérim

### Objectif
Ajouter un système d'onglets sur `/rapprochement-interim` avec deux onglets :
- **Rapprochement** (vue actuelle, par défaut)
- **Intérimaires** (nouvelle vue : liste complète avec gestion CRUD)

### Modifications

**Fichier : `src/pages/RapprochementInterim.tsx`**

1. Ajouter un state `activeTab` (`"rapprochement"` | `"interimaires"`)
2. Importer `Tabs, TabsList, TabsTrigger, TabsContent` depuis `@/components/ui/tabs`
3. Envelopper le contenu principal (après `PageHeader`) dans un composant `Tabs`
4. L'onglet "Rapprochement" contient tout le contenu existant (filtres + tableau groupé par agence)
5. L'onglet "Intérimaires" réutilise directement le composant `InterimairesManager` existant (qui inclut déjà : tableau avec nom/prénom/agence/affectation, bouton "Nouvel intérimaire", édition, suppression, et `InterimaireFormDialog`)

### Ce qui est réutilisé tel quel
Le composant `InterimairesManager` de `src/components/admin/InterimairesManager.tsx` fait déjà exactement ce qui est demandé (CRUD intérimaires). Il sera importé et affiché dans le `TabsContent` "interimaires" sans modification.

### Aucune migration DB nécessaire
Les données sont déjà filtrées par `entreprise_id` via les hooks existants (`useUtilisateursByRole`), donc Carole ne verra que les intérimaires SDER.

