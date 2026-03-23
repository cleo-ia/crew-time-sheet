

## Plan : Reactiver le flag `contrainteVendredi12h` pour Limoge-Revillon

### Fichier : `src/config/enterprises/limoge-revillon.ts`

**Modification unique, ligne 18 :**

```
Avant :  contrainteVendredi12h: false, // TEMPORAIREMENT DÉSACTIVÉ pour test - remettre à true après
Après :  contrainteVendredi12h: true, // Actif: bloque transmission S avant vendredi (chefs + conducteurs + finisseurs)
```

Cela active les regles 2 et 3 du verrouillage temporel pour Limoge-Revillon :
- Les chefs ne peuvent plus transmettre la semaine S avant vendredi
- Les conducteurs et finisseurs non plus
- La transmission de S-1 et anterieur reste possible a tout moment

La regle 1 (planning verrouille le vendredi) est deja active sans flag.

