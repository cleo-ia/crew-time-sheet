
Objectif: corriger le crash immédiat lors du changement de code trajet et restaurer le dialog “Appliquer à plusieurs jours ?” au format normal (centré, taille normale), en gardant le bouton X.

1) Diagnostic confirmé
- L’erreur runtime vient de la structure actuelle de `CodeTrajetSelector`:
  - `AlertDialogCancel`/`AlertDialogAction` sont rendus hors de `AlertDialogContent`.
  - D’où l’exception: "`AlertDialogCancel` must be used within `AlertDialogContent`".
- C’est ce crash qui déclenche l’`ErrorBoundary` (écran rouge “Une erreur est survenue”).

2) Correction structurelle (sans changer la logique métier)
- Fichier: `src/components/ui/alert-dialog.tsx`
  - Étendre `AlertDialogContent` pour accepter un `container` optionnel (passé à `AlertDialogPortal`) afin de pouvoir forcer le rendu dans `document.body` quand nécessaire.
  - Garder le comportement par défaut inchangé pour tous les autres dialogs.

- Fichier: `src/components/timesheet/CodeTrajetSelector.tsx`
  - Supprimer la structure “manuelle” (`AlertDialogPortal` + `<div fixed ...>`) qui casse le contexte Radix.
  - Revenir à un vrai `AlertDialogContent` (avec `container={document.body}`), et placer dedans:
    - le bouton X (inchangé visuellement),
    - `AlertDialogHeader`,
    - `AlertDialogFooter`,
    - `AlertDialogCancel` / `AlertDialogAction`.
  - Conserver exactement les comportements:
    - X: ferme sans appliquer (reset `pendingValue`),
    - “Ce jour uniquement”: applique uniquement ce jour,
    - “Tous les jours”: applique en batch.

3) Sécurisation UX
- Dans `onOpenChange`, remettre `pendingValue` à `null` quand le dialog se ferme (clic hors dialog / ESC / X), pour éviter tout état résiduel.

4) Vérification fonctionnelle (obligatoire)
- Tester en bout-en-bout sur `/consultation-rh`:
  - Ouverture du dialog après changement de code trajet avec plusieurs jours.
  - Aucun crash / plus d’écran ErrorBoundary.
  - Dialog centré, taille normale, overlay correct.
  - X ferme sans appliquer.
  - “Ce jour uniquement” met à jour 1 ligne.
  - “Tous les jours” met à jour toutes les lignes attendues + toast batch.

5) Mise en production
- Publier après validation preview pour rendre le correctif effectif en prod.
