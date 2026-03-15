

# Plan : Fusion intelligente des données journalières pour chefs multi-chantiers

## Problème

Dans `rhShared.ts` (lignes 702-718), quand un chef a plusieurs fiches le même jour, seul le `jourRef` (entrée avec le "meilleur statut") est utilisé pour les champs ville, type d'absence, commentaire et type de repas. Les données des autres entrées sont ignorées.

## Fichier modifié

`src/hooks/rhShared.ts` — bloc lignes 697-718 uniquement

## Corrections (4 champs)

### 1. Ville → concaténer toutes les villes
Actuellement : `jourRef.ville_du_jour` → ex: "Massilly"
Après : `"Massilly + Capucines"` (même logique que le code chantier ligne 698-700)

### 2. Type d'absence → scanner toutes les entrées
Actuellement : `jourRef.type_absence` → peut être `null` si l'absence est déclarée sur le chantier secondaire
Après : chercher le premier `type_absence` non-null parmi toutes les `entries`

### 3. Commentaire → concaténer tous les commentaires
Actuellement : `jourRef.commentaire` → un seul commentaire gardé
Après : fusionner tous les commentaires non-vides avec `" | "` comme séparateur

### 4. Type de repas → prioriser l'entrée qui a le panier coché
Actuellement : `jourRef.repas_type` → peut dire "RESTO" alors que le panier vient d'un autre chantier
Après : prendre le `repas_type` de l'entrée où `PA === true` en priorité

## Logique exacte

```typescript
// Ville : fusion comme les codes chantier
const chantierVille = isChef && entries.length > 1
  ? [...new Set(entries.map(e => e.jour.ville_du_jour).filter(Boolean))].join(" + ")
  : jourRef.ville_du_jour || "";

// Type absence : premier non-null trouvé
const typeAbsence = isChef && entries.length > 1
  ? entries.map(e => (e.jour as any).type_absence).find(t => t != null) || null
  : (jourRef as any).type_absence || null;

// Commentaire : concaténation
const commentaire = isChef && entries.length > 1
  ? entries.map(e => (e.jour as any).commentaire).filter(Boolean).join(" | ")
  : (jourRef as any).commentaire || "";

// Repas type : priorité à l'entrée avec PA coché
const repasType = isChef && entries.length > 1
  ? (entries.find(e => e.jour.PA)?.jour as any)?.repas_type 
    || (jourRef as any).repas_type || null
  : (jourRef as any).repas_type || null;
```

## Impact

- Aucun changement pour les ouvriers/intérimaires (condition `isChef && entries.length > 1`)
- Aucun changement sur les calculs d'heures, paniers, trajets, absences (déjà corrects)
- Affecte uniquement l'affichage dans la vue consolidée RH, le détail semaine et l'export Excel/PDF

