

# Ajout d'un Indicateur Visuel pour le Chantier Principal

## Objectif

Pour les chefs multi-chantiers, ajouter un indicateur visuel dans le sélecteur de chantier ("Choisir un chantier") qui identifie clairement le **chantier principal** - celui sur lequel le chef peut saisir ses propres heures.

## Comportement Attendu

| Chantier | Affichage actuel | Affichage après correction |
|----------|------------------|---------------------------|
| LE ROSEYRAN (principal) | `LE ROSEYRAN` | `⭐ LE ROSEYRAN` + badge "Principal" |
| COEUR DE BALME EST (secondaire) | `COEUR DE BALME EST` | `COEUR DE BALME EST` (inchangé) |

## Modification Technique

**Fichier** : `src/components/timesheet/ChantierSelector.tsx`

### 1. Ajouter la récupération du chantier principal du chef

Ajouter une query pour récupérer le `chantier_principal_id` de l'utilisateur sélectionné :

```typescript
// Récupérer le chantier principal du chef (pour l'indicateur visuel)
const { data: chefChantierPrincipal } = useQuery({
  queryKey: ["chef-chantier-principal", chefId],
  queryFn: async () => {
    if (!chefId) return null;
    
    const { data, error } = await supabase
      .from("utilisateurs")
      .select("chantier_principal_id")
      .eq("id", chefId)
      .maybeSingle();
    
    if (error) throw error;
    return data?.chantier_principal_id || null;
  },
  enabled: !!chefId,
});
```

### 2. Modifier l'affichage des options du Select

Ajouter une icône étoile et un badge "Principal" pour le chantier principal :

```typescript
// Dans le rendu des SelectItem
{chantiers.map((chantier) => {
  const isPrincipal = chefChantierPrincipal === chantier.id;
  
  return (
    <SelectItem key={chantier.id} value={chantier.id} className={compact ? "text-sm" : "text-base"}>
      {compact ? (
        <span className="flex items-center gap-1">
          {isPrincipal && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
          {chantier.code_chantier} - {chantier.nom}
          {isPrincipal && <span className="text-[10px] text-amber-600 font-medium ml-1">(Mes heures)</span>}
        </span>
      ) : (
        <div className="flex flex-col">
          <span className="font-medium flex items-center gap-1.5">
            {isPrincipal && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
            {chantier.nom}
            {isPrincipal && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                Mes heures
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {chantier.code_chantier} • {chantier.ville}
          </span>
        </div>
      )}
    </SelectItem>
  );
})}
```

### 3. Import de l'icône Star

```typescript
import { Star } from "lucide-react";
```

## Exemple Visuel

**Avant** :
```
┌────────────────────────────────────────┐
│ COEUR DE BALME EST                     │
│ CI229BALME • GRENOBLE                  │
├────────────────────────────────────────┤
│ ✓ LE ROSEYRAN                          │  ← Sélectionné mais rien n'indique que c'est le principal
│ CI230ROSEYRAN • LA TRONCHE             │
└────────────────────────────────────────┘
```

**Après** :
```
┌────────────────────────────────────────┐
│ COEUR DE BALME EST                     │
│ CI229BALME • GRENOBLE                  │
├────────────────────────────────────────┤
│ ⭐ LE ROSEYRAN  [Mes heures]           │  ← Indicateur clair
│ CI230ROSEYRAN • LA TRONCHE             │
└────────────────────────────────────────┘
```

## Pourquoi "Mes heures" plutôt que "Principal"

Le terme "Principal" est un peu technique. "Mes heures" est plus clair pour le chef car il comprend immédiatement que c'est sur ce chantier qu'il pourra saisir ses propres heures.

## Impact

- **Aucun autre fichier modifié**
- **Aucune régression** : l'ajout est purement visuel
- **Compatible avec tous les chefs** : ceux qui n'ont qu'un seul chantier ne verront pas de différence (pas de badge "Mes heures" si un seul chantier disponible)

