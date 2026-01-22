

# Plan : Rendre le champ "Chef d'équipe" vraiment optionnel

## Constat

Le champ "Chef d'équipe" est déjà marqué comme optionnel dans l'interface et la base de données accepte une valeur NULL pour `chef_id`. Cependant, le composant de sélection ne permet pas de **désélectionner** un chef une fois qu'un choix a été fait.

## Solution

Ajouter une option "Aucun" en première position dans la liste déroulante du chef d'équipe, permettant de créer un chantier sans chef ou de retirer un chef existant.

## Modification à effectuer

**Fichier** : `src/components/admin/ChantiersManager.tsx`

**Changement** : Dans le `Select` du chef d'équipe (lignes 338-350), ajouter une option "Aucun" qui remet la valeur à chaîne vide.

```text
Avant :
<SelectContent>
  {chefs.map((c) => (
    <SelectItem key={c.id} value={c.id}>
      {c.prenom} {c.nom}
    </SelectItem>
  ))}
</SelectContent>

Après :
<SelectContent>
  <SelectItem value="">Aucun</SelectItem>
  {chefs.map((c) => (
    <SelectItem key={c.id} value={c.id}>
      {c.prenom} {c.nom}
    </SelectItem>
  ))}
</SelectContent>
```

## Vérification de la logique de sauvegarde

La fonction `handleSave` envoie déjà `chef_id: ""` tel quel, et la base de données convertit une chaîne vide en `NULL` (comportement Supabase standard pour les UUID). Aucune modification du hook n'est nécessaire.

## Impact

- **Aucune régression** : Le champ reste optionnel et fonctionne comme avant
- **Amélioration UX** : L'utilisateur peut maintenant désélectionner un chef
- **1 seul fichier modifié** : `ChantiersManager.tsx`

