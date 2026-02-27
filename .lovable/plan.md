

## Plan : Affiner la page Rapprochement Intérimaires

### 1. Vue détail comme côté RH (lecture seule)
Remplacer le Dialog basique (tableau jour par jour) par le composant `RHEmployeeDetail` existant, en mode **lecture seule** :
- Quand on clique sur l'œil, on passe dans un état "détail" qui affiche `RHEmployeeDetail` avec le `salarieId` et les `filters` actuels
- Masquer les éléments éditables : on ajoute une prop `readOnly` à `RHEmployeeDetail` qui désactive les `EditableCell`, `EditableAbsenceTypeCell`, `EditableTextCell`, `CodeTrajetSelector` et les mutations
- Garder l'export PDF individuel et le dialog semaine (`RHWeekDetailDialog`)

### 2. Export PDF par agence
Intégrer le `InterimaireExportDialog` existant :
- Ajouter un bouton "Export PDF" dans le header de la page
- Ouvrir le dialog avec les `filters` courants (période, agence)
- Le dialog permet déjà de sélectionner une semaine et d'exporter par agence ou toutes les agences

### 3. Regroupement par agence dans le tableau
Grouper les lignes du tableau par agence avec des en-têtes de section :
- Trier les intérimaires par agence puis par nom
- Insérer une ligne d'en-tête colorée pour chaque agence (nom + nombre d'intérimaires)
- Les intérimaires sans agence sont regroupés sous "Sans agence"

### 4. Sous-totaux par agence
Ajouter une ligne de totaux après chaque groupe d'agence :
- Total heures normales, H. Supp 25%, H. Supp 50%, absences, paniers, trajets pour l'agence
- Style distinct (fond grisé, texte en gras)

### 5. Fix filtre agence
Le problème : `AgenceInterimCombobox` est un champ texte libre (conçu pour créer de nouvelles agences). Pour le filtre, il faut un **Select classique** avec les options "Toutes" + liste des agences extraites des données.
- Remplacer `AgenceInterimCombobox` par un `Select` simple dans la page Rapprochement
- Options : "Toutes les agences" + agences uniques extraites des données chargées

### Fichiers modifiés
- `src/pages/RapprochementInterim.tsx` — refonte complète (vue détail, regroupement, totaux, filtre, export)
- `src/components/rh/RHEmployeeDetail.tsx` — ajout prop `readOnly?: boolean` pour masquer les champs éditables

