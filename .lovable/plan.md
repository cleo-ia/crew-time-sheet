

# Correction des paniers/trajets sur jours d'absence -- 2 endroits restants

## Le probleme

La correction precedente dans `rhShared.ts` fonctionne pour la vue consolidee (liste des employes), mais **deux autres endroits** calculent les paniers et trajets sans verifier si le jour est une absence :

1. **"Resume global de la periode"** (en haut de la fiche employe) -- fichier `src/hooks/useRHData.ts`, ligne 806
2. **"Recapitulatif par semaine"** (paniers par semaine) -- fichier `src/components/rh/RHEmployeeDetail.tsx`, ligne 103

Ces deux endroits comptent le panier des que `day.panier === true`, meme si l'employe a 0h travaillees et 0h intemperies.

## La solution

Ajouter la meme condition d'absence dans ces 2 fichiers.

## Detail technique

### Fichier 1 : `src/hooks/useRHData.ts` (ligne ~806)

Remplacer :
```typescript
totalPaniers: dailyDetails.filter(d => d.panier).length,
totalTrajets: dailyDetails.filter(d => (d as any).codeTrajet).length,
```

Par :
```typescript
totalPaniers: dailyDetails.filter(d => d.panier && (d.heuresNormales > 0 || d.heuresIntemperies > 0)).length,
totalTrajets: dailyDetails.filter(d => (d as any).codeTrajet && (d.heuresNormales > 0 || d.heuresIntemperies > 0)).length,
```

### Fichier 2 : `src/components/rh/RHEmployeeDetail.tsx` (lignes ~103-104)

Remplacer :
```typescript
weekData.paniers += day.panier ? 1 : 0;
weekData.trajets += (day as any).codeTrajet && (day as any).codeTrajet !== 'A_COMPLETER' ? 1 : 0;
```

Par :
```typescript
const isAbsentDay = (day.heuresNormales || 0) === 0 && (day.heuresIntemperies || 0) === 0;
weekData.paniers += (!isAbsentDay && day.panier) ? 1 : 0;
weekData.trajets += (!isAbsentDay && (day as any).codeTrajet && (day as any).codeTrajet !== 'A_COMPLETER') ? 1 : 0;
```

Cela garantit que les 3 niveaux d'affichage (global, par semaine, et par jour) appliquent tous la meme regle : pas de panier ni trajet sur un jour d'absence.
