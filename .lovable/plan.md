

## Fix : Afficher le chantier filtré (DAVOULT) au lieu de "Sur MAILLARD"

### Problème
Quand un chef a 0h sur le chantier filtré, le bloc `isOnOtherSite` (ligne 944-958 de `useRHData.ts`) garde les infos de l'autre site dans `otherSiteCode`/`otherSiteNom`, et les composants UI affichent un badge "Sur MAILLARD". L'utilisateur veut voir **DAVOULT** (le chantier filtré) avec 0h.

### Correction

**`src/hooks/useRHData.ts` (~ligne 944-958)** : dans le bloc `isOnOtherSite`, forcer `chantierNom`/`chantierCode`/`chantier` au chantier filtré et ne plus mettre `isOnOtherSite = true` :

```typescript
if (hoursOnFilteredSite === 0 && intemperiesOnFilteredSite === 0 && jour.heuresNormales > 0) {
  // Chef was on another site — show filtered site with 0h
  (jour as any).isOnOtherSite = false;
  jour.isAbsent = false;
  jour.heuresNormales = 0;
  jour.heuresIntemperies = 0;
  jour.codeTrajet = null;
  jour.trajetPerso = false;
  jour.panier = false;
  // Force filtered site identity
  if (filteredChantierInfo) {
    jour.chantierNom = filteredChantierInfo.nom || jour.chantierNom;
    jour.chantierCode = filteredChantierInfo.code_chantier || jour.chantierCode;
    jour.chantier = filteredChantierInfo.nom || jour.chantier;
  }
}
```

Résultat : quand on filtre DAVOULT, chaque jour affiche **DAVOULT** dans la colonne chantier avec 0h — plus de badge "Sur MAILLARD".

