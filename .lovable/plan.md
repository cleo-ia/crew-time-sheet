

## Confirmation de sécurité du plan

Après relecture complète des 4 fichiers impactés, je confirme que le plan est **sans risque de régression**. Voici pourquoi :

### Analyse fichier par fichier

**1. Nouveau hook `useAbsencesLongueDureePlanning.ts`**
- Fichier entièrement nouveau, aucun code existant touché
- Lecture seule sur `absences_longue_duree` (table déjà utilisée ailleurs)
- Retourne une simple `Map` calculée, aucun effet de bord

**2. `PlanningMainOeuvre.tsx`**
- Ajout d'un appel au nouveau hook (ligne ~103, après les autres hooks) : additif
- `handleDayToggle` : ajout d'un `if` de garde **avant** le code existant. Si l'absence n'est pas concernée, le flux existant s'exécute tel quel
- `handleAddEmploye` : filtrage des jours **avant** la boucle existante. Si aucun jour n'est filtré, le comportement est identique
- Passage d'une nouvelle prop optionnelle à `PlanningChantierAccordion` : rétro-compatible

**3. `PlanningChantierAccordion.tsx`**
- Ajout d'une prop optionnelle `absencesLDByEmploye?: Map<string, ...>` : rétro-compatible (les composants existants qui ne la passent pas ne sont pas affectés car elle est optionnelle)
- Transmission à `PlanningEmployeRow` via une nouvelle prop optionnelle `absenceDays` : même logique
- Transmission à `AddEmployeeToPlanningDialog` via une nouvelle prop optionnelle : même logique

**4. `PlanningEmployeRow.tsx`**
- Ajout d'une prop optionnelle `absenceDays?: Map<string, string>` : si non fournie, `undefined`, et le code existant s'exécute normalement
- Nouveau composant `AbsenceIndicator` : pur ajout, similaire au `ConflictIndicator` déjà existant
- Dans le rendu des jours : ajout d'un `if (absenceDays?.has(day.date))` **avant** les conditions existantes. Si `absenceDays` est `undefined`, la condition est `false` et le code existant prend le relais

**5. `AddEmployeeToPlanningDialog.tsx`**
- Ajout d'une prop optionnelle `absencesLDByEmploye` : si non fournie, aucun changement de comportement
- Fusion dans `daysTakenByEmploye` : les jours LD sont ajoutés **en plus** des jours déjà pris, sans modifier la logique existante
- Badge visuel "Absent" : rendu conditionnel uniquement si la prop est fournie

### Résumé

| Aspect | Risque |
|--------|--------|
| Props existantes modifiées | Aucune |
| Logique existante modifiée | Aucune (gardes ajoutées avant) |
| Requêtes Supabase modifiées | Aucune |
| Mutations modifiées | Aucune (filtrage avant appel) |
| Nouvelles tables/colonnes SQL | Aucune |
| Composants sans la nouvelle prop | Comportement identique (props optionnelles) |

Toutes les modifications sont **purement additives**. Le plan est sûr.

