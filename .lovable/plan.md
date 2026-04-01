

## Fixer les boutons "Sauvegarder brouillon" et "Transmettre" en bas de l'écran

### Changement

**`src/components/chantier/tabs/ChantierInventaireTab.tsx`** — ligne 235 :

Remplacer `sticky bottom-4` par `fixed bottom-0 left-0 right-0` avec un padding et un fond pour que les boutons restent toujours visibles en bas de l'écran, même en scrollant. Ajouter un `pb-20` sur le conteneur parent pour éviter que le contenu soit masqué par les boutons.

- Le `div` des boutons : `fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t`
- Le conteneur parent (`div.space-y-4`) : ajouter `pb-20` quand `isEditable` pour compenser la hauteur fixe

