

## Correction des imports croisés dans AppNav.tsx

**Problème** : `src/components/navigation/AppNav.tsx` lignes 7-8, les imports sont inversés :
- `logoSder` importe `logo-engo-bourgogne.png`
- `logoEngoBourgogne` importe `logo-sder.png`

**Correction** : permuter les deux chemins (et supprimer les commentaires trompeurs) :
```ts
import logoSder from "@/assets/logo-sder.png";
import logoEngoBourgogne from "@/assets/logo-engo-bourgogne.png";
```

Un seul fichier, deux lignes.

