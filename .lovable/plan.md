# Mode lecture seule pour les chefs - TERMINÉ

## Résumé

Le mode lecture seule pour les chefs est maintenant complet sur les onglets **Planning**, **Todo** et **Récap**.

## Fichiers modifiés

- `src/pages/ChantierDetail.tsx` - Propagation de `isReadOnly` aux onglets
- `src/components/chantier/tabs/ChantierKanbanTab.tsx` - Prop `readOnly` + masquage boutons
- `src/components/chantier/tabs/ChantierTodoTab.tsx` - Prop `readOnly` + masquage boutons + drag désactivé
- `src/components/chantier/tabs/TodoDetailDialog.tsx` - Affichage statique en lecture seule
- `src/components/chantier/planning/TaskDetailDialog.tsx` - Lecture seule complète

## Comportement final

| Élément | Mode édition | Mode lecture (chef) |
|---------|--------------|---------------------|
| Titre de tâche | Éditable | Texte statique ✓ |
| Statut | Dropdown | Badge statique ✓ |
| Dates (début/fin) | Input date | Texte statique ✓ |
| Heures estimées | Input number | Texte statique ✓ |
| Heures réalisées | Input number | Texte statique ✓ |
| Montant vendu | Input number | Texte statique ✓ |
| Bouton "Ajouter achat" | Visible | Masqué ✓ |
| Zone commentaires | Visible | Masquée ✓ |
| Upload fichiers | ✓ | ✓ Conservé |
| Supprimer fichiers | ✓ | Masqué ✓ |
| Bouton suppression tâche | Visible | Masqué ✓ |
| Drag & drop todos | Actif | Désactivé ✓ |
| Boutons création | Visible | Masqué ✓ |
