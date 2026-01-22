

# Correction : Erreur "nouveau chantier" - SelectItem avec valeur vide

## Diagnostic

L'erreur provient directement de la modification récente dans `ChantiersManager.tsx` ligne 343 :

```tsx
<SelectItem value="">Aucun</SelectItem>  // ❌ INTERDIT par Radix UI
```

**Radix UI Select n'accepte pas une chaîne vide comme valeur** pour `<SelectItem>`. C'est une contrainte de conception du composant car la valeur vide est réservée pour réinitialiser la sélection et afficher le placeholder.

## Solution

Utiliser une valeur sentinel (ex: `"__none__"`) au lieu d'une chaîne vide, puis convertir cette valeur en `null` avant l'envoi à la base de données.

## Modifications à effectuer

### Fichier : `src/components/admin/ChantiersManager.tsx`

**1. Modifier le SelectItem "Aucun" (ligne 343)**

```tsx
// Avant
<SelectItem value="">Aucun</SelectItem>

// Après
<SelectItem value="__none__">Aucun</SelectItem>
```

**2. Adapter le handler `onValueChange` (ligne 338)**

```tsx
// Avant
onValueChange={(value) => setFormData({ ...formData, chef_id: value })}

// Après
onValueChange={(value) => setFormData({ ...formData, chef_id: value === "__none__" ? "" : value })}
```

**3. Adapter la valeur affichée dans le Select (ligne 338)**

```tsx
// Avant
<Select value={formData.chef_id} ...>

// Après
<Select value={formData.chef_id || "__none__"} ...>
```

## Impact

- **1 seul fichier modifié** : `ChantiersManager.tsx`
- **Aucune modification base de données** : la valeur `""` continue d'être envoyée et convertie en `NULL`
- **UX identique** : l'utilisateur voit toujours "Aucun" comme première option
- **Correction immédiate** du crash

## Résumé technique

| Élément | Avant | Après |
|---------|-------|-------|
| Valeur SelectItem | `""` (interdit) | `"__none__"` (valide) |
| Valeur dans formData | `""` | `""` (inchangé) |
| Valeur envoyée à Supabase | `""` → `NULL` | `""` → `NULL` (inchangé) |

