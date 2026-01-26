

# Plan : Corriger l'inversion des logos SDER / Engo Bourgogne

## Problème identifié

Les **fichiers image physiques** sont mal nommés dans `src/assets/` :
- `logo-sder.png` contient en réalité le logo **Engo Bourgogne** (texte "engo bourgogne" visible)
- `logo-engo-bourgogne.png` contient en réalité le logo **SDER** (texte "sder" visible)

Ma correction précédente a remis les imports "dans l'ordre logique", mais comme les fichiers eux-mêmes sont inversés, cela a créé le bug que tu vois.

---

## Solution recommandée

**Ré-inverser les imports** dans `Auth.tsx` et `AppNav.tsx` pour compenser l'inversion des fichiers :

```text
┌─────────────────────────────────────────────────────────────────┐
│  Import                        →  Fichier physique             │
├─────────────────────────────────────────────────────────────────┤
│  logoEngoBourgogne            →  logo-sder.png                 │
│  logoSder                     →  logo-engo-bourgogne.png       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/Auth.tsx` | Ligne 10-11 : inverser les imports |
| `src/components/navigation/AppNav.tsx` | Ligne 5-6 : inverser les imports |

---

## Détails techniques

### Auth.tsx (lignes 9-11)

**Avant :**
```typescript
import logoLimogeRevillon from "@/assets/logo-limoge-revillon.png";
import logoEngoBourgogne from "@/assets/logo-engo-bourgogne.png";
import logoSder from "@/assets/logo-sder.png";
```

**Après :**
```typescript
import logoLimogeRevillon from "@/assets/logo-limoge-revillon.png";
import logoEngoBourgogne from "@/assets/logo-sder.png";        // Fichier SDER = logo Engo
import logoSder from "@/assets/logo-engo-bourgogne.png";       // Fichier Engo = logo SDER
```

### AppNav.tsx (lignes 4-6)

**Avant :**
```typescript
import logoLimogeRevillon from "@/assets/logo-limoge-revillon.png";
import logoSder from "@/assets/logo-sder.png";
import logoEngoBourgogne from "@/assets/logo-engo-bourgogne.png";
```

**Après :**
```typescript
import logoLimogeRevillon from "@/assets/logo-limoge-revillon.png";
import logoSder from "@/assets/logo-engo-bourgogne.png";       // Fichier Engo = logo SDER
import logoEngoBourgogne from "@/assets/logo-sder.png";        // Fichier SDER = logo Engo
```

---

## Alternative propre (recommandée à terme)

Pour éviter cette confusion à l'avenir, il serait préférable de **renommer les fichiers physiques** correctement :
1. Renommer `logo-sder.png` → `logo-engo-bourgogne.png` (et vice versa)
2. Remettre les imports dans l'ordre logique

Mais pour une correction rapide, l'inversion des imports fonctionne.

---

## Résultat attendu

- Page Auth avec SDER sélectionné → Affiche logo SDER + texte "Connectez-vous à SDER"
- Page Auth avec Engo Bourgogne sélectionné → Affiche logo Engo Bourgogne + texte "Connectez-vous à Engo Bourgogne"
- Navigation (AppNav) → Logo correct selon l'entreprise connectée

