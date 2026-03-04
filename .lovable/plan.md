

# Plan : Page de prévisualisation du mail conducteur passif

## Objectif

Créer une page temporaire `/email-preview` dans l'app qui affiche le rendu visuel exact du mail que Fabrice et Osman recevront, directement dans le navigateur.

## Modification

**Créer un fichier `src/pages/EmailPreview.tsx`** qui :
1. Génère le même HTML que la edge function (en reproduisant le contenu avec des données d'exemple : 3 employés fictifs avec leurs jours)
2. L'injecte dans une iframe via `srcdoc` pour un rendu fidèle
3. Affiche les deux versions (Fabrice / 2CB et Osman / PAM) côte à côte ou en tabs

**Ajouter la route `/email-preview`** dans `App.tsx` (sans protection auth, temporaire).

Le HTML sera construit en copiant les mêmes fonctions template (`generateEmailHtml`, `createAlertBox`, `createListItem`, `createSectionTitle`) côté client, avec des données d'exemple réalistes.

