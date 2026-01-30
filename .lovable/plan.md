
# Plan : Préserver le contexte d'entreprise dans les liens email

## Problème identifié

Lorsqu'un utilisateur SDER clique sur un lien de réinitialisation de mot de passe ou d'invitation, il arrive sur la page `/auth` qui affiche Limoge Revillon par défaut car :
1. Les emails de réinitialisation/invitation redirigent vers `/auth` sans contexte d'entreprise
2. La page Auth initialise le carrousel à l'index 0 (Limoge Revillon) par défaut

## Solution proposée

Ajouter un paramètre `entreprise` dans les URLs de redirection et le lire à l'arrivée sur `/auth`.

---

## Modifications techniques

### 1. Edge function `invite-user/index.ts`

Modifier les 3 appels `redirectTo` pour inclure le slug d'entreprise :

```typescript
// Récupérer le slug de l'entreprise
const { data: entreprise } = await supabaseAdmin
  .from('entreprises')
  .select('slug')
  .eq('id', finalEntrepriseId)
  .single();

const entrepriseSlug = entreprise?.slug || '';
const baseUrl = req.headers.get('origin') || 'https://crew-time-sheet.lovable.app';
const redirectUrl = `${baseUrl}/auth?entreprise=${entrepriseSlug}`;

// Ligne 272, 322, 400 : utiliser redirectUrl
```

### 2. Page `Auth.tsx` - Frontend

#### a) Lire le paramètre `entreprise` depuis l'URL au chargement

```typescript
// Dans le useEffect initial ou avec useSearchParams
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const entrepriseParam = params.get('entreprise');
  
  if (entrepriseParam) {
    const index = ENTREPRISES.findIndex(e => e.slug === entrepriseParam);
    if (index >= 0) {
      setSelectedIndex(index);
      // Optionnel : nettoyer l'URL
      window.history.replaceState({}, '', '/auth');
    }
  }
}, []);
```

#### b) Modifier `handleResetPassword` pour inclure l'entreprise sélectionnée

```typescript
const handleResetPassword = async () => {
  // ...validation...
  const redirectUrl = `${window.location.origin}/auth?entreprise=${selectedEntreprise.slug}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  // ...
};
```

#### c) Modifier `handleMagicLink` pour la cohérence

```typescript
const handleMagicLink = async () => {
  // ...validation...
  const redirectUrl = `${window.location.origin}/auth?entreprise=${selectedEntreprise.slug}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl },
  });
  // ...
};
```

---

## Flux après correction

```text
                    AVANT                              APRES
                    -----                              -----
Invitation SDER                            Invitation SDER
      |                                          |
      v                                          v
Email: redirectTo=/auth                    Email: redirectTo=/auth?entreprise=sder
      |                                          |
      v                                          v
Page Auth: Limoge (defaut)                 Page Auth: SDER (pre-selectionne)
```

---

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/invite-user/index.ts` | Ajouter le slug d'entreprise dans les 3 URLs de redirection |
| `src/pages/Auth.tsx` | Lire le parametre `entreprise` de l'URL + modifier `handleResetPassword` et `handleMagicLink` |

---

## Impact

- Aucun changement de comportement pour les utilisateurs existants
- Les nouveaux liens email redirigeront vers la bonne entreprise
- La selection manuelle du carrousel reste possible
