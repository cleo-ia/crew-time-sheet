

# Plan : Bouton d'envoi de mail urgent depuis le diagnostic de blocage

## Objectif

Ajouter un bouton dans `FicheBlockDetailDialog` qui envoie un email d'urgence pour transmission/validation des fiches. Le destinataire est déterminé automatiquement par le diagnostic :
- **Bloqué côté chef** → email au chef
- **Bloqué côté conducteur** → email au conducteur

## Modifications

### 1. Nouvelle Edge Function — `supabase/functions/rappel-urgence-export/index.ts`

Edge function qui reçoit `{ targetUserId, targetRole, semaine, chantierNom, teamCount }` et :
- Récupère le profil (email, prénom) du destinataire via `profiles`
- Construit un email HTML avec le template existant (`generateEmailHtml`) en mode `alerte`
- Envoie via Resend
- Insère un historique dans `rappels_historique`

Suit le même pattern que `rappel-chefs` (Resend + shared email template + CORS + service role).

### 2. Enrichir le hook — `src/hooks/useFicheBlockDetail.ts`

Ajouter `chefEmail` et `conducteurEmail` à l'interface `FicheBlockDetail`. Les récupérer depuis la table `profiles` (qui contient l'email des users auth) en plus de `utilisateurs`.

### 3. Nouveau hook — `src/hooks/useSendUrgentRappel.ts`

Mutation qui appelle `supabase.functions.invoke("rappel-urgence-export", { body: {...} })` avec toast de succès/erreur.

### 4. Modifier — `src/components/rh/FicheBlockDetailDialog.tsx`

- Importer `Button` et le hook `useSendUrgentRappel`
- Ajouter un bouton sous le diagnostic badge :
  - Si `bloque_chef` : "Envoyer un rappel urgent au chef" (icône Mail)
  - Si `bloque_conducteur` : "Envoyer un rappel urgent au conducteur" (icône Mail)
  - Si `mixte` : deux boutons
- Confirmation via state + texte "Êtes-vous sûr ?" avant envoi
- Spinner pendant l'envoi

## Résumé des fichiers

| Fichier | Action |
|---|---|
| `supabase/functions/rappel-urgence-export/index.ts` | Créer |
| `src/hooks/useFicheBlockDetail.ts` | Modifier (ajouter emails) |
| `src/hooks/useSendUrgentRappel.ts` | Créer |
| `src/components/rh/FicheBlockDetailDialog.tsx` | Modifier (bouton) |

## Détails techniques

- L'email est envoyé via Resend (clé `RESEND_API_KEY` déjà configurée)
- Le template utilise `generateEmailHtml` avec `emailType: 'alerte'` pour un style urgent
- Le contenu mentionne la semaine, le chantier, et le nombre de fiches en attente
- L'historique est tracé dans `rappels_historique` avec `type = 'urgence_export'`

