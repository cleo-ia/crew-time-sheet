

## Correction simple : agrandir le dialogue

Au lieu de réorganiser le flex interne, on agrandit le `DialogContent` pour qu'il prenne la quasi-totalité de l'écran (style plein écran). Le contenu a alors assez de place pour tout afficher, bouton "Ajouter" inclus.

**Fichier** : `src/components/planning/AddEmployeeToPlanningDialog.tsx`

**Changement** : Remplacer `max-h-[80vh]` par `max-h-[95vh]` (ou `h-[95vh]`) sur le `DialogContent`, et éventuellement élargir aussi avec `max-w-3xl` ou `max-w-4xl` pour profiter de l'espace. Le scroll interne existant (`ScrollArea`) continue de gérer la liste si elle dépasse.

Un seul changement CSS, une seule ligne.

