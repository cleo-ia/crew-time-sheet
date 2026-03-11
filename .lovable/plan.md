

## Plan : Tri des demandes de congés par date de début (plus proche en premier)

### Modification

**Fichier** : `src/hooks/useDemandesCongesRH.ts`, ligne 19

Changer le tri Supabase de `created_at` (date de création) vers `date_debut` (date de début du congé), en ordre **croissant** :

```typescript
// Avant
.order("created_at", { ascending: false });

// Après
.order("date_debut", { ascending: true });
```

Les demandes dont la date de début est la plus proche apparaîtront en premier dans tous les onglets (À valider, Attente cond., Traitées).

1 fichier, 1 ligne modifiée.

