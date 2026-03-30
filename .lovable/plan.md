
Objectif: corriger la régression sur l’onglet **Transport RH** (écran vide depuis l’ajout des badges) et conserver les badges **uniquement** dans “Récapitulatif conducteurs”.

1) Diagnostic confirmé
- Le composant `src/components/rh/RHTransportTab.tsx` lit actuellement `utilisateurs` avec `.select("id, nom, prenom, role")`.
- Dans le schéma (`src/integrations/supabase/types.ts`), la colonne existante est `role_metier` (pas `role`).
- Cette erreur de colonne fait échouer la requête et casse le chargement des données transport.

2) Correctif à appliquer (fichier unique)
- Fichier: `src/components/rh/RHTransportTab.tsx`
- Remplacer la sélection utilisateurs:
  - de: `id, nom, prenom, role`
  - vers: `id, nom, prenom, role_metier`
- Adapter le mapping des badges:
  - utiliser `u.role_metier` pour remplir `userRoleMap`.
- Conserver l’affichage des badges **seulement** dans le tableau “Récapitulatif conducteurs”.
- Ne rien changer dans le tableau de détail (matin/soir sans badge), comme demandé.

3) Robustesse (petite sécurité)
- Ajouter une gestion d’erreur explicite côté UI (état `isError`) pour éviter un faux “Aucune donnée” quand une requête échoue.
- Message d’erreur clair: “Erreur de chargement des données transport” + suggestion de rafraîchir.

4) Vérifications fonctionnelles
- Cas 1: `Période = mois`, `Semaine = Toutes` → données visibles + badges dans le récap.
- Cas 2: `Période = mois`, `Semaine = semaine précise` → filtrage semaine respecté + badges visibles dans le récap.
- Cas 3: employé sans `role_metier` → nom visible sans badge.
- Cas 4: aucune donnée réelle → état vide normal “Aucune donnée de transport”.
