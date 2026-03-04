

## Fix: ECOLE sites must not trigger "Absent" badge at 0h

### Changes in `src/components/timesheet/TimeEntryTable.tsx`

**1. Add `is_ecole` to chantiers query (line 221)**
```
.select("id, nom, code_chantier, ville, actif, is_ecole")
```

**2. Derive `isCurrentChantierEcole` (after line 230)**
```typescript
const isCurrentChantierEcole = chantiers?.find(c => c.id === chantierId)?.is_ecole === true;
```

**3. Conductor mode absence logic (line 443)**
```
absent: !isCurrentChantierEcole && hours === 0 && HI === 0,
```

**4. Chef mode absence logic (line 571)**
```
: (!isCurrentChantierEcole && hours === 0 && !PA && HI === 0),
```

This is a display-only change. No data is modified. Non-ECOLE sites are unaffected.

