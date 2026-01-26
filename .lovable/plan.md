
# Plan : Rendre le champ "Agence d'intérim" obligatoire

## Contexte

Actuellement, le formulaire de création d'intérimaire permet de laisser le champ "Agence d'intérim" vide, ce qui cause des problèmes :
- L'intérimaire créé n'apparaît pas dans la liste (car le filtre utilise `agence_interim IS NOT NULL`)
- L'intérimaire est affiché comme "Finisseur" dans l'onglet Utilisateurs

## Point clé : Un seul fichier à modifier

Le composant `InterimaireFormDialog` est réutilisé aux deux endroits mentionnés :
1. **Admin Panel** → Onglet "Intérimaires" → Bouton "Nouvel intérimaire"
2. **Page Saisie Chef** → Dialog "Gérer mon équipe" → Bouton "Créer intérimaire d'urgence"

En modifiant ce seul fichier, les deux formulaires seront corrigés automatiquement.

---

## Modifications prévues

### Fichier : `src/components/shared/InterimaireFormDialog.tsx`

**1. Ajouter l'astérisque d'obligation sur le label (ligne 98)**

```
Avant : <Label>Agence d'intérim</Label>
Après : <Label>Agence d'intérim *</Label>
```

**2. Ajouter une validation dans `handleSave` (ligne 45)**

```typescript
const handleSave = async () => {
  // Nouvelle validation
  if (!formData.agence_interim.trim()) {
    toast({
      title: "Champ obligatoire",
      description: "L'agence d'intérim doit être renseignée",
      variant: "destructive",
    });
    return;
  }
  
  // ... reste du code existant
};
```

**3. Désactiver le bouton si l'agence est vide (ligne 116)**

```
Avant : <Button onClick={handleSave}>
Après : <Button onClick={handleSave} disabled={!formData.agence_interim.trim()}>
```

**4. Importer le hook toast (ligne 6)**

```typescript
import { useToast } from "@/hooks/use-toast";
```

**5. Initialiser le hook dans le composant (après ligne 30)**

```typescript
const { toast } = useToast();
```

---

## Récapitulatif des changements

| Ligne | Modification |
|-------|-------------|
| 6 | Ajouter import `useToast` |
| ~30 | Ajouter `const { toast } = useToast();` |
| 45-48 | Ajouter validation avant `try` |
| 98 | Changer label en `Agence d'intérim *` |
| 116 | Ajouter `disabled={!formData.agence_interim.trim()}` au bouton |

---

## Comportement après modification

1. Le label affichera "Agence d'intérim *" pour indiquer que c'est obligatoire
2. Le bouton "Créer" sera grisé tant que l'agence n'est pas renseignée
3. Si l'utilisateur clique sur "Créer" avec un champ vide (ne devrait pas arriver grâce au bouton désactivé), un toast d'erreur s'affichera
4. Le message d'avertissement existant (en orange) reste visible pour rappeler de préciser la ville

---

## Résultat attendu

- **Admin Panel** : Impossible de créer un intérimaire sans agence
- **Page Saisie Chef** : Impossible de créer un intérimaire d'urgence sans agence
- Les intérimaires créés apparaîtront correctement dans la liste
- Plus de confusion avec le rôle "Finisseur"
