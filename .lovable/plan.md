

## Plan : Bouton Conversation dans le header de la page Rapprochement

Le bouton Conversation est actuellement dans la nav (AppNav) mais l'utilisateur veut le voir dans le header de la page, à côté de "Export PDF" et "Nouvel intérimaire".

### Modifications

**`src/pages/RapprochementInterim.tsx`** :
- Importer `ConversationButton`, `ConversationListSheet`, `useUnreadMessages`, `supabase`, et ajouter les states nécessaires (`showConversation`, `currentUserId`)
- Ajouter un `useEffect` pour récupérer le `currentUserId`
- Ajouter le `ConversationButton` dans le bloc `actions` du `PageHeader`, entre "Export PDF" et "Nouvel intérimaire"
- Ajouter le rendu de `ConversationListSheet` en bas du composant

**`src/components/navigation/AppNav.tsx`** :
- Retirer le `ConversationButton` et `ConversationListSheet` de la nav gestionnaire (puisqu'il sera dans la page directement)

