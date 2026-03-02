

## Correction des logos inversés sur la page Auth

**Problème confirmé** : lignes 10-11 de `src/pages/Auth.tsx`, les imports sont croisés :
- `logoEngoBourgogne` importe `logo-sder.png`
- `logoSder` importe `logo-engo-bourgogne.png`

**Correction** : permuter les deux chemins d'import :
```ts
import logoEngoBourgogne from "@/assets/logo-engo-bourgogne.png";
import logoSder from "@/assets/logo-sder.png";
```

Un seul fichier modifié, deux lignes corrigées.

