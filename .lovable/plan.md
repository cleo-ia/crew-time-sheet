

## Remplacer l'onglet "Détail chantier/semaine" par un onglet "Transport"

### Objectif
Afficher pour le mois sélectionné dans les filtres RH un récapitulatif de tous les conducteurs (matin et soir) extraits des tables `fiches_transport` + `fiches_transport_jours`, groupé par date et chantier.

### Fichiers modifiés

**1. Nouveau composant : `src/components/rh/RHTransportTab.tsx`**

- Props : `{ filters: any }` (utilise `filters.periode` pour le mois)
- Hook React Query qui :
  - Récupère toutes les `fiches_transport` dont la `semaine` correspond au mois sélectionné (même logique de filtrage par jours ouvrés que le reste de la page RH)
  - Joint `fiches_transport_jours` avec les noms des conducteurs via `utilisateurs` (conducteur_aller = matin, conducteur_retour = soir)
  - Joint `chantiers` pour le nom/code du chantier
- Affichage en tableau :
  - Colonnes : **Date** | **Chantier** | **Véhicule (immat)** | **Conducteur matin** | **Conducteur soir**
  - Trié par date croissante puis par chantier
  - Skeleton loading + état vide
  - Message si aucun mois sélectionné

**2. Modification : `src/pages/ConsultationRH.tsx`**

- Import du nouveau composant
- Remplacer le `TabsTrigger` "Détail chantier/semaine" (value `detail`) par "Transport" avec icône `Truck`
- Remplacer le `TabsContent` correspondant : `<RHTransportTab filters={filters} />` au lieu de `<RHDetailView />`
- Supprimer l'import de `RHDetailView` (plus utilisé)

### Ce qui ne change pas
- Aucune modification de base de données
- Les autres onglets restent identiques
- Les filtres RH existants sont réutilisés (seul `periode` est exploité pour filtrer le mois)

### Détail technique
- La jointure sur `fiches_transport_jours` utilise les FK existantes : `conducteur_aller_id` → `utilisateurs` (matin) et `conducteur_retour_id` → `utilisateurs` (soir)
- Le filtrage par mois se fait en calculant les dates lundi-vendredi de chaque semaine et vérifiant si elles tombent dans le mois sélectionné (cohérent avec la règle des jours ouvrés du système RH)

