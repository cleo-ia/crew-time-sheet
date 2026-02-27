

## Plan : Vue détail agence avec accordéons

### Modification
**Fichier : `src/pages/RapprochementInterim.tsx`**

1. Ajouter un state `selectedAgence` (string | null) à côté de `selectedSalarieId`
2. Rendre le bandeau d'agence cliquable (cursor-pointer + hover) avec un onClick qui set `selectedAgence`
3. Ajouter une condition : si `selectedAgence` est défini, afficher une vue pleine page avec :
   - Header avec bouton retour, nom de l'agence, badge nombre d'intérimaires
   - Cards récap (heures normales, supp, absences, paniers, trajets) pour l'agence
   - Liste des intérimaires de cette agence, chacun dans un `AccordionItem` dépliable
   - Chaque accordéon contient un `RHEmployeeDetail` en mode `readOnly` (sans le bouton retour propre au composant)

### Détail technique
- Filtrer `employees` par `agence_interim === selectedAgence` pour obtenir la liste
- Utiliser le composant `Accordion` existant (type="multiple" pour pouvoir déplier plusieurs à la fois)
- Chaque `AccordionTrigger` affiche nom + prénom + total heures
- Chaque `AccordionContent` contient `<RHEmployeeDetail salarieId={emp.id} filters={filters} onBack={() => {}} readOnly />`
- Le bouton retour principal ramène à la liste (`setSelectedAgence(null)`)

