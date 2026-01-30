

# Migration des emails d'invitation vers Resend

## Objectif

Personnaliser dynamiquement les emails d'invitation pour afficher le nom de l'entreprise correcte (SDER, Limoge Revillon, Engo Bourgogne) au lieu du template statique "Limoge Revillon" de Supabase.

## Analyse des risques

Après analyse approfondie du code existant, voici les garanties de non-régression :

### Pourquoi c'est sûr

1. **Création utilisateur préservée** : La fonction `generateLink({ type: 'invite' })` de Supabase crée l'utilisateur dans `auth.users` exactement comme `inviteUserByEmail()`. La documentation officielle confirme : "generateLink() handles the creation of the user for signup, invite and magiclink".

2. **Trigger inchangé** : Le trigger `handle_new_user_signup` se déclenche sur toute insertion dans `auth.users`. La création via `generateLink()` déclenche ce trigger normalement, donc les tables `profiles`, `user_roles`, et `utilisateurs` seront correctement mises à jour.

3. **Lien d'invitation compatible** : Le lien généré par `generateLink()` a exactement le même format que celui de `inviteUserByEmail()` (avec les tokens dans le hash). La page de connexion (`Auth.tsx`) continuera de fonctionner sans modification.

4. **Resend éprouvé** : Le service Resend est déjà utilisé avec succès depuis 6 semaines pour 4 fonctions de rappel (chefs, conducteurs, finisseurs). Même configuration, même clé API.

### Ce qui ne change pas

- Structure de la table `invitations`
- Mode Bootstrap (premier admin sans authentification)
- Validation du domaine `@groupe-engo.com`
- Gestion des utilisateurs existants (ajout de rôle, renvoi d'invitation)
- Redirection vers `/auth?entreprise=xxx`
- Formulaire de définition du mot de passe

## Modifications techniques

### 1. Template d'email d'invitation

**Fichier** : `supabase/functions/_shared/emailTemplate.ts`

Ajout d'une nouvelle fonction qui génère un email d'invitation avec le nom d'entreprise en paramètre, utilisant le même design professionnel que les emails de rappel existants.

### 2. Fonction d'invitation

**Fichier** : `supabase/functions/invite-user/index.ts`

Modifications :
- Récupérer le nom complet de l'entreprise (pas seulement le slug)
- Remplacer `inviteUserByEmail()` par `generateLink({ type: 'invite' })` pour générer le lien sans envoyer d'email
- Envoyer l'email via Resend avec le template personnalisé contenant le nom d'entreprise
- Conserver la logique de rollback existante en cas d'erreur

## Résultat attendu

Avant (problème actuel) :
```
Header : "Limoge Revillon - Groupe ENGO"
```

Après (corrigé) :
```
Header : "SDER - Groupe ENGO"     (pour invitations SDER)
Header : "Limoge Revillon - Groupe ENGO"  (pour invitations LR)
Header : "Engo Bourgogne - Groupe ENGO"   (pour invitations EB)
```

## Point d'attention

Les emails de réinitialisation de mot de passe (pour utilisateurs existants) continuent d'utiliser le template Supabase. Une migration similaire pourra être faite en phase 2 si nécessaire.

## Tests recommandés

1. Inviter un nouvel utilisateur pour chaque entreprise et vérifier le contenu de l'email
2. Cliquer sur le lien d'invitation et vérifier l'arrivée sur le bon carrousel d'entreprise
3. Définir le mot de passe et vérifier la création complète du compte
4. Vérifier que les rappels existants fonctionnent toujours

