

## Correction du logo Engo Bourgogne

Le fichier `src/assets/logo-engo-bourgogne.png` contient actuellement le mauvais visuel. Il faut le remplacer par le logo fourni (celui avec le "G" rouge/bleu et "en'go bourgogne").

**Action :**
1. Copier `user-uploads://Plan_de_travail_132@600x-2.png` vers `src/assets/logo-engo-bourgogne.png` (écrase l'ancien fichier)
2. Vérifier que `src/pages/Auth.tsx` et `src/config/enterprises/engo-bourgogne.ts` importent bien `@/assets/logo-engo-bourgogne.png` (déjà corrigé au diff précédent)

Un seul fichier à remplacer, les imports sont déjà corrects.

