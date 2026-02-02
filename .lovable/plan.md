
# Indicateur Visuel "Chantier Secondaire" pour le Chef dans le Récapitulatif Signatures

## Contexte

Sur la page `/signature-macons`, quand le chef Philippe DURAND est sélectionné sur son **chantier secondaire** (ex: COEUR DE BALME EST), le récapitulatif de ses heures s'affiche normalement sans aucune indication que ces heures sont **à titre indicatif uniquement** puisque ses vraies heures sont saisies sur son chantier principal.

## Objectif

Ajouter un indicateur visuel clair dans le récapitulatif des heures quand :
1. L'employé sélectionné est le **chef de chantier** (`isChef === true`)
2. Et que le chantier actuel n'est **pas** son chantier principal

## Message à afficher

Un bandeau d'avertissement visuel expliquant :
- C'est un chantier secondaire
- Les heures affichées sont à **titre indicatif**
- Les heures réelles sont saisies sur son chantier principal
- En fin de flux RH, seules les heures du chantier principal seront comptées

## Modifications Techniques

**Fichier** : `src/pages/SignatureMacons.tsx`

### 1. Ajouter une query pour récupérer le chantier principal du chef

```typescript
// Récupérer le chantier principal du chef
const { data: chefChantierPrincipal } = useQuery({
  queryKey: ["chef-chantier-principal-signature", chefId],
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

// Calculer si on est sur un chantier secondaire
const isChantierSecondaire = chefChantierPrincipal && chantierId && chefChantierPrincipal !== chantierId;
```

### 2. Ajouter le bandeau d'avertissement dans le récapitulatif des heures

Avant le tableau des heures (ligne ~408), ajouter conditionnellement un bandeau d'avertissement pour le chef sur un chantier secondaire :

```typescript
{selectedMacon.isChef && isChantierSecondaire && (
  <div className="flex items-start gap-3 p-4 mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
        Chantier secondaire - Heures indicatives
      </p>
      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
        Vos heures réelles sont saisies sur votre chantier principal. 
        Les heures affichées ici sont à titre indicatif uniquement et ne seront pas comptabilisées pour la paie.
      </p>
    </div>
  </div>
)}
```

### 3. Modifier le header du récapitulatif pour le chef sur chantier secondaire

```typescript
<CardTitle className="text-lg flex items-center gap-2">
  <Clock className="h-5 w-5 text-primary" />
  Récapitulatif de vos heures - Semaine {semaine}
  {selectedMacon.isChef && (
    <RoleBadge role="chef" size="sm" />
  )}
  {selectedMacon.isChef && isChantierSecondaire && (
    <Badge variant="outline" className="ml-2 text-xs bg-amber-100 text-amber-700 border-amber-300">
      Indicatif
    </Badge>
  )}
</CardTitle>
<p className="text-sm text-muted-foreground mt-1">
  {selectedMacon.isChef && isChantierSecondaire 
    ? "Heures de ce chantier secondaire (non comptabilisées)"
    : "Vérifiez vos heures avant de signer"
  }
</p>
```

### 4. Importer les icônes nécessaires

```typescript
import { AlertTriangle, Star } from "lucide-react";
```

## Résultat Visuel Attendu

**Pour le chef sur son chantier principal (inchangé)** :
```
┌──────────────────────────────────────────────────────────┐
│ 🕐 Récapitulatif de vos heures - Semaine 2026-S07  [Chef de chantier] │
│ Vérifiez vos heures avant de signer                     │
├──────────────────────────────────────────────────────────┤
│ ...tableau des heures...                                 │
└──────────────────────────────────────────────────────────┘
```

**Pour le chef sur un chantier secondaire (NOUVEAU)** :
```
┌──────────────────────────────────────────────────────────┐
│ 🕐 Récapitulatif de vos heures - Semaine 2026-S07  [Chef de chantier] [Indicatif] │
│ Heures de ce chantier secondaire (non comptabilisées)   │
├──────────────────────────────────────────────────────────┤
│ ⚠️  Chantier secondaire - Heures indicatives            │
│     Vos heures réelles sont saisies sur votre chantier  │
│     principal. Les heures affichées ici sont à titre    │
│     indicatif uniquement et ne seront pas comptabilisées│
│     pour la paie.                                        │
├──────────────────────────────────────────────────────────┤
│ ...tableau des heures...                                 │
└──────────────────────────────────────────────────────────┘
```

## Impact

- **Fichier unique modifié** : `src/pages/SignatureMacons.tsx`
- **Aucune régression** : 
  - Les maçons/ouvriers ne sont pas impactés
  - Le chef sur son chantier principal ne voit aucun changement
  - Seul le chef sur un chantier secondaire voit le nouveau bandeau
- **RoleBadge et Badge déjà importés** dans ce fichier

## Fichiers NON Modifiés

- `src/hooks/useMaconsByChantier.ts` - aucun changement
- `src/components/signature/SignaturePad.tsx` - aucun changement
- Aucun autre fichier impacté
