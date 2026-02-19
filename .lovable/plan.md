

# Corriger la persistance du trajet dans TimeEntryTable + nettoyage BDD S09

## Corrections code

**`src/components/timesheet/TimeEntryTable.tsx`** - deux lignes a modifier :

### Ligne 420 : lire T depuis la BDD au lieu de forcer true

```typescript
// Avant
const trajet = (isTrajetPerso || isGD) ? false : true;

// Apres
const dbTrajet = Number(j.T || 0) > 0;
const trajet = (isTrajetPerso || isGD) ? false : dbTrajet;
```

### Ligne 444 : ne pas forcer A_COMPLETER

```typescript
// Avant
codeTrajet: ((j as any).code_trajet || (trajet ? "A_COMPLETER" : null))

// Apres
codeTrajet: ((j as any).code_trajet || null)
```

## Nettoyage BDD (semaine S09)

Les donnees corrompues de Thomas sur le chantier secondaire **S09** :

```sql
UPDATE fiches_jours fj
SET "T" = 0, code_trajet = NULL
FROM fiches f
WHERE fj.fiche_id = f.id
  AND f.semaine = '2026-S09'
  AND f.salarie_id = '03e2cebf-c96f-41bf-b860-3bbeb3f97d5f'
  AND f.chantier_id = 'f55e04cf-6521-4b51-9e0f-f3f23653003b'
  AND fj."HNORM" = 0;
```

## Resume

| Quoi | Detail |
|------|--------|
| Fichier modifie | `src/components/timesheet/TimeEntryTable.tsx` (lignes 420 et 444) |
| Nettoyage BDD | S09, Thomas, chantier secondaire, jours a 0h |
| Resultat | Cases trajet respectent la valeur BDD, donnees corrompues nettoyees |

