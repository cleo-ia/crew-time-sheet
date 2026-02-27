

## Plan : 2 fonctionnalités

### 1. Marquage "rapproché" par agence et par semaine

**Base de données** : Créer une table `rapprochements_status` :
- `id` (uuid, PK)
- `entreprise_id` (uuid, FK entreprises)
- `agence_name` (text)
- `semaine` (text, format "2026-S09")
- `periode` (text, format "2026-02")
- `rapproche` (boolean, default false)
- `rapproche_at` (timestamptz)
- `rapproche_by` (uuid)
- contrainte unique sur `(entreprise_id, agence_name, semaine)`
- RLS : accès restreint par `entreprise_id`

**UI** : Sur chaque ligne d'en-tête agence dans le tableau, ajouter une checkbox (ou icône toggle) à droite. Quand le filtre semaine est actif → toggle le statut pour cette agence + cette semaine. Quand "toutes les semaines" → afficher un résumé (ex: "2/4 semaines rapprochées") et ne pas permettre de cocher directement (il faut filtrer une semaine).

**Hook** : `useRapprochementStatus(periode, entrepriseId)` qui charge tous les statuts du mois, + mutation pour toggle.

### 2. Ajouter le bouton Conversation pour le gestionnaire

**Fichier `AppNav.tsx`** (lignes 84-120) : Dans la nav isolée gestionnaire, ajouter le `ConversationButton` + `ConversationListSheet` comme sur les autres pages (AdminPanel, ConsultationRH).

**Fichier `RapprochementInterim.tsx`** : Pas besoin de toucher ici puisque la conversation est dans la nav.

Imports nécessaires dans AppNav : `ConversationButton`, `ConversationListSheet`, `useUnreadMessages`, + state `showConversation`.

