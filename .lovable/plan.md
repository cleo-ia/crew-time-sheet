
# Correction des emails reset password avec branding dynamique

## Problème
Les emails de réinitialisation de mot de passe envoyés depuis la page de connexion utilisent le template Supabase par défaut avec le branding "Limoge Revillon" statique, au lieu du branding dynamique de l'entreprise sélectionnée (SDER, Engo Bourgogne, etc.).

## Cause racine
La fonction `handleResetPassword` dans `Auth.tsx` appelle directement `supabase.auth.resetPasswordForEmail()` - l'API native Supabase qui utilise les templates email configurés dans le dashboard Supabase.

## Solution

### 1. Créer une nouvelle edge function `send-password-reset`

**Fichier : `supabase/functions/send-password-reset/index.ts`**

Cette fonction :
- Reçoit l'email et le slug de l'entreprise
- Valide que l'email est bien `@groupe-engo.com`
- Récupère le nom de l'entreprise depuis le slug
- Génère un lien de recovery via `supabaseAdmin.auth.admin.generateLink()`
- Envoie l'email via Resend avec `generatePasswordResetEmailHtml()` et le branding dynamique

### 2. Modifier `Auth.tsx`

Remplacer l'appel direct à `supabase.auth.resetPasswordForEmail()` par un appel à la nouvelle edge function :

```typescript
const handleResetPassword = async () => {
  // ...validation email...
  
  const response = await supabase.functions.invoke('send-password-reset', {
    body: {
      email: email.trim(),
      entreprise_slug: selectedEntreprise.slug
    }
  });
  
  if (response.error) throw response.error;
  toast.success("Email envoyé pour réinitialiser votre mot de passe.");
};
```

### 3. Configurer la fonction dans `config.toml`

Ajouter la configuration pour désactiver la vérification JWT (la fonction est publique).

## Flux résultant

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         Page Auth (/auth)                               │
│                                                                         │
│  1. Utilisateur entre son email                                         │
│  2. Clique sur "Réinitialiser mot de passe"                            │
│  3. Appel à l'edge function send-password-reset                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Edge Function: send-password-reset                    │
│                                                                         │
│  1. Valide l'email (@groupe-engo.com)                                  │
│  2. Récupère le nom de l'entreprise depuis le slug                     │
│  3. Génère le lien de recovery (supabaseAdmin.auth.admin.generateLink) │
│  4. Envoie l'email via Resend avec branding dynamique                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Email reçu                                    │
│                                                                         │
│  Header: "SDER - Groupe Engo" (dynamique selon l'entreprise)           │
│  Contenu: "Vous avez demandé à réinitialiser votre mot de passe..."   │
│  Bouton: "Réinitialiser mon mot de passe"                              │
└─────────────────────────────────────────────────────────────────────────┘
```

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `supabase/functions/send-password-reset/index.ts` | Création |
| `supabase/config.toml` | Ajout configuration |
| `src/pages/Auth.tsx` | Modification `handleResetPassword` |

## Résultat attendu

| Avant | Après |
|-------|-------|
| Email avec header "Limoge Revillon - Groupe ENGO" | Email avec header dynamique selon l'entreprise sélectionnée |
| Template Supabase par défaut | Template DIVA personnalisé via Resend |

## Détails techniques

### Edge function `send-password-reset`

```typescript
// Entrées
{
  email: string,         // Email de l'utilisateur
  entreprise_slug: string // Slug de l'entreprise sélectionnée (limoge-revillon, sder, engo-bourgogne)
}

// Sorties
{
  success: true,
  message: "Email de réinitialisation envoyé"
}
```

### Template utilisé

La fonction `generatePasswordResetEmailHtml()` existe déjà dans `_shared/emailTemplate.ts` et affiche :
- Header avec le nom de l'entreprise dynamique
- Message de réinitialisation de mot de passe
- Bouton CTA vers le lien de reset

### Sécurité

- Validation du domaine email `@groupe-engo.com`
- Pas de JWT requis (fonction publique pour permettre le reset)
- L'email doit correspondre à un compte existant (géré par Supabase)
