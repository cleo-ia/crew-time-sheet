

## Correction S09 - Sébastien BOUILLET : inverser les heures entre MAILLARD et DAVOULT

### Problème

Les heures sont inversées entre les deux chantiers :
- **DAVOULT** (secondaire) : fiche `1c787ef9` → actuellement **39h** (8/8/8/8/7, PA=true, T=1) → devrait être **0h**
- **MAILLARD** (principal) : fiche `bde705ab` → actuellement **0h** (PA=false, T=0) → devrait être **39h**

### Corrections SQL (via insert tool, pas migration)

**1. Remettre DAVOULT à 0h** (fiche `1c787ef9-412e-452b-a56b-baa69a41755e`) :
- 5 fiches_jours : `heures=0`, `HNORM=0`, `PA=false`, `T=0`, `code_trajet=null`
- fiche : `total_heures=0`

**2. Mettre MAILLARD à 39h** (fiche `bde705ab-e2da-4bf0-9747-41a840df05f8`) :
- 4 jours (lun-jeu) : `heures=8`, `HNORM=8`, `PA=true`, `T=1`, `code_trajet='A_COMPLETER'`
- 1 jour (vendredi) : `heures=7`, `HNORM=7`, `PA=true`, `T=1`, `code_trajet='A_COMPLETER'`
- fiche : `total_heures=39`

Le trigger `recalculate_fiche_total_heures` recalculera automatiquement le total, mais on force aussi par sécurité.

