

## Confirmation

Oui, la correction ligne 729 résoudra le problème. Voici pourquoi :

**Situation actuelle (ligne 729) :**
```typescript
if (filters.periode && (!filters.semaine || filters.semaine === "all")) {
```

Quand `filters.periode = "all"` (sélection "Toutes"), le code entre dans le bloc, parse `"all".split("-")` → `[NaN, NaN]`, ce qui crée des dates invalides → **tous les jours sont exclus** → 0h affiché.

**Après correction :**
```typescript
if (filters.periode && filters.periode !== "all" && (!filters.semaine || filters.semaine === "all")) {
```

Quand `filters.periode = "all"`, la condition est court-circuitée → `fichesJoursFiltrees` garde **tous les jours** sans filtre calendaire → les 13 jours d'Amadeu (S06 + S07 + S08) s'afficheront correctement dans le détail jour par jour avec :

- **S06** : 5 jours, 39h, paniers ✓, trajets ✓
- **S07** : 5 jours, 39h, paniers ✓, trajets ✓
- **S08** : 3 jours (16-18 fév), 24h + les 2 jours MAILLARD existants

Correction d'une seule ligne, aucun effet de bord.

