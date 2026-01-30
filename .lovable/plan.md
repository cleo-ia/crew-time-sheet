

# Correction des emails de réinitialisation de mot de passe

## Problèmes identifiés

### 1. Emails reset password avec branding "Limoge Revillon"
Les appels à `resetPasswordForEmail()` dans `invite-user/index.ts` (lignes 284 et 334) utilisent encore le template statique Supabase au lieu de Resend avec branding dynamique.

### 2. Problème de connexion après reset
Les logs montrent que le compte `sebastien.lanteri@groupe-engo.com` a été correctement créé et que le mot de passe a été défini avec succès (login à 14:26:18). Les erreurs "Invalid login credentials" ultérieures sont liées à :
- Un token expiré réutilisé ("One-time token not found")
- Un mot de passe incorrect lors des tentatives suivantes

Pour résoudre ce cas immédiat, l'utilisateur peut demander un nouveau reset password depuis la page de connexion.

## Solution technique

### Fichier : `supabase/functions/_shared/emailTemplate.ts`

Ajouter une nouvelle fonction de template pour les emails de reset password :

```typescript
export function generatePasswordResetEmailHtml(
  entrepriseNom: string,
  resetUrl: string,
  email: string
): string {
  // Template similaire aux invitations mais adapté au reset password
  // Header: "${entrepriseNom} - Groupe Engo"
  // Titre: "Réinitialisation de mot de passe"
  // Message: "Vous avez demandé à réinitialiser votre mot de passe..."
  // CTA: "Réinitialiser mon mot de passe"
}
```

### Fichier : `supabase/functions/invite-user/index.ts`

Modifier les deux endroits où `resetPasswordForEmail()` est appelé :

**Ligne 280-311 (mode resend - utilisateur existant avec même rôle) :**

```typescript
// Au lieu de:
const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(...)

// Utiliser generateLink + Resend:
const { data: resetLinkData, error: resetLinkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'recovery',
  email: email.toLowerCase(),
  options: { redirectTo: redirectUrl }
});

const resetLink = resetLinkData?.properties?.action_link;
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
await resend.emails.send({
  from: 'DIVA <rappels-diva-LR@groupe-engo.com>',
  to: [email.toLowerCase()],
  subject: `Réinitialisation de mot de passe - ${entrepriseNom}`,
  html: generatePasswordResetEmailHtml(entrepriseNom, resetLink, email),
});
```

**Ligne 333-343 (ajout de rôle - même logique) :**

Appliquer la même modification pour envoyer l'email de reset via Resend.

## Résultat attendu

Avant :
- Email reset password avec header "Limoge Revillon - Groupe ENGO" statique

Après :
- Email reset password avec header dynamique selon l'entreprise (SDER, Limoge Revillon, Engo Bourgogne)

## Pour le cas immédiat (sebastien.lanteri)

L'utilisateur peut :
1. Aller sur la page de connexion SDER
2. Cliquer sur "Mot de passe oublié" 
3. Recevoir un nouveau lien de reset (encore avec le branding Limoge Revillon jusqu'à cette correction)
4. Définir son mot de passe correctement

Une fois la correction déployée, tous les futurs emails de reset auront le bon branding.

## Tests à effectuer

1. Réinviter un utilisateur existant sur SDER qui a déjà le même rôle
2. Vérifier que l'email reçu affiche "SDER - Groupe Engo"
3. Cliquer sur le lien et vérifier que le reset password fonctionne
4. Se connecter avec le nouveau mot de passe

