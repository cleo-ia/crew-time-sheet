

# Ajouter un bouton "Exporter Excel" dans la barre du Pré-export

## Objectif

Ajouter un bouton d'export Excel a cote du filtre "Tous les metiers" (ligne 576-593 du fichier), qui exporte uniquement les salaries filtres avec leurs modifications manuelles prises en compte.

## Modifications

**Fichier : `src/components/rh/RHPreExport.tsx`**

1. **Ajouter l'icone `Download`** dans les imports Lucide (ligne d'import existante).

2. **Modifier `handleExport`** pour utiliser `filteredRows` au lieu de `rows`, afin de respecter le filtre metier actif.

3. **Ajouter le bouton** dans la zone droite de la barre d'actions (entre le Select "Tous les metiers" et le compteur de salaries) :
   - Icone `Download` + texte "Exporter Excel"
   - Desactive pendant le chargement ou si aucune donnee filtree

## Resultat

Le bouton apparaitra sur la meme ligne que "Tous les metiers" et le compteur "52 / 52 salaries". Il generera un fichier Excel identique a l'export definitif, mais uniquement avec les salaries visibles apres application des filtres RH et du filtre metier.

