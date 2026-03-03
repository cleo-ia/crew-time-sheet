

## Correction : Tri des fiches validées du plus récent au plus ancien

### Changement

Un seul fichier à modifier : **`src/hooks/useFiches.ts`**, ligne 312.

**Avant :** `a.semaine.localeCompare(b.semaine)` → tri chronologique (ancien → récent)
**Après :** `b.semaine.localeCompare(a.semaine)` → tri anti-chronologique (récent → ancien)

C'est tout. Les semaines sont au format `2026-W10` donc le tri alphabétique inversé donne bien le bon ordre.

