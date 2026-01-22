

# Correction : Erreur UUID lors de la création de chantier sans chef

## Cause du problème

La fonction `handleSave` envoie `chef_id: ""` (chaîne vide) à Supabase, mais PostgreSQL rejette cette valeur car une chaîne vide n'est pas un UUID valide. Il faut explicitement envoyer `null`.

## Solution

Modifier la fonction `handleSave` dans `ChantiersManager.tsx` pour convertir les chaînes vides en `null` avant l'envoi.

## Modification à effectuer

**Fichier** : `src/components/admin/ChantiersManager.tsx`

**Lignes 55-63** - Modifier la construction du payload :

```typescript
// Avant
const payload = {
  ...formData,
  date_debut: formData.date_debut ? format(formData.date_debut, "yyyy-MM-dd") : null,
  date_fin: formData.date_fin ? format(formData.date_fin, "yyyy-MM-dd") : null,
  insertion_heures_requises: formData.insertion_heures_requises ? parseInt(formData.insertion_heures_requises) : null,
  insertion_date_debut: formData.insertion_date_debut ? format(formData.insertion_date_debut, "yyyy-MM-dd") : null,
  statut_insertion: formData.statut_insertion || null,
};

// Après
const payload = {
  ...formData,
  chef_id: formData.chef_id || null,           // ← AJOUT: convertir "" en null
  conducteur_id: formData.conducteur_id || null, // ← AJOUT: sécurité supplémentaire
  date_debut: formData.date_debut ? format(formData.date_debut, "yyyy-MM-dd") : null,
  date_fin: formData.date_fin ? format(formData.date_fin, "yyyy-MM-dd") : null,
  insertion_heures_requises: formData.insertion_heures_requises ? parseInt(formData.insertion_heures_requises) : null,
  insertion_date_debut: formData.insertion_date_debut ? format(formData.insertion_date_debut, "yyyy-MM-dd") : null,
  statut_insertion: formData.statut_insertion || null,
};
```

## Explication technique

| Valeur dans formData | Après transformation | Envoyé à Supabase |
|---------------------|---------------------|-------------------|
| `chef_id: ""` | `chef_id: null` | `NULL` (valide) |
| `chef_id: "abc-123..."` | `chef_id: "abc-123..."` | UUID (valide) |

## Impact

- **1 fichier modifié** : `ChantiersManager.tsx`
- **2 lignes ajoutées** dans le payload
- **Correction immédiate** de l'erreur UUID
- **Aucune régression** : les chantiers avec chef continuent de fonctionner

