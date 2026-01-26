
# Plan révisé : Correction complète du `chantier_id` pour les fiches finisseurs

## ⚠️ ALERTE : Plan initial incomplet

L'analyse approfondie révèle que le plan initial ciblait uniquement 3-4 fichiers, alors que **10+ fichiers** utilisent le pattern `.is("chantier_id", null)` pour les finisseurs. Modifier seulement les hooks transport sans mettre à jour les autres fichiers **causerait des régressions majeures**.

## Résumé de l'impact

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FICHIERS IMPACTÉS PAR LE CHANGEMENT                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HOOKS TRANSPORT (ciblés initialement)                                      │
│  ├── useAutoSaveTransportFinisseur.ts     ✅ À modifier                     │
│  └── useSaveTransportFinisseur.ts         ✅ À modifier                     │
│                                                                             │
│  HOOKS FICHES (NON ciblés - RÉGRESSIONS)                                    │
│  ├── useAutoSaveFiche.ts                  ⚠️ DOIT être modifié              │
│  ├── useSaveFiche.ts                      ⚠️ DOIT être modifié              │
│  ├── useDeleteFicheJourForAffectation.ts  ⚠️ DOIT être modifié              │
│  └── useFinisseursFichesThisWeek.ts       ⚠️ DOIT être modifié              │
│                                                                             │
│  HOOKS COPIE/INIT (NON ciblés - RÉGRESSIONS)                                │
│  ├── useCopyPreviousWeekFinisseurs.ts     ⚠️ DOIT être modifié              │
│  └── useInitializeNextWeekFromPrevious.ts ⚠️ DOIT être modifié              │
│                                                                             │
│  COMPOSANTS (NON ciblés - RÉGRESSIONS)                                      │
│  └── FinisseursDispatchWeekly.tsx         ⚠️ DOIT être modifié              │
│                                                                             │
│  HOOKS TRANSPORT V2 (à vérifier)                                            │
│  ├── useSaveTransportV2.ts                ⚡ Conditionnellement impacté     │
│  └── useAutoSaveTransportV2.ts            ⚡ Conditionnellement impacté     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Partie 1 : Correction des données (SQL) - INCHANGÉE

Corriger les 5 fiches de la semaine S04 avec le bon `chantier_id` :

```sql
-- MAILLARD
UPDATE fiches SET chantier_id = 'c8b507d6-f1ae-4c13-aee9-e069aca0358c'
WHERE id = '1d468b4e-a7cc-45ef-95a0-1fa27dd1e86f';

-- CREUSOT HENRI
UPDATE fiches SET chantier_id = '47df69da-0cb6-46c0-a6cb-6e6caa1dafb7'
WHERE id = '5a3c8609-759d-4195-9966-2149f8ccbf30';

-- BACHEVELIN (3 fiches)
UPDATE fiches SET chantier_id = '5b183833-f3a6-4456-a9f2-b122e00a00c4'
WHERE id IN (
  '66556827-aa53-4e8b-93b0-e6e119e10485',
  '706ad41e-a0b8-4f1a-b648-4a0f53ec66af',
  'bddd0141-7765-4f43-9d81-d3867fbe87de'
);
```

---

## Partie 2 : Modification du type

### `src/types/transport.ts`
Ajouter `chantierId` comme champ obligatoire :

```typescript
export interface SaveTransportFinisseurParams {
  ficheId: string;
  finisseurId: string;
  conducteurId: string;
  semaine: string;
  chantierId: string;  // ← NOUVEAU - obligatoire
  days: TransportFinisseurDay[];
}
```

---

## Partie 3 : Modification des hooks transport finisseurs

### `src/hooks/useAutoSaveTransportFinisseur.ts`
Remplacer les 3 occurrences de `.is("chantier_id", null)` par `.eq("chantier_id", chantierId)` et l'insert de `chantier_id: null` par `chantier_id: chantierId`.

### `src/hooks/useSaveTransportFinisseur.ts`
Même modification que ci-dessus.

---

## Partie 4 : Modification des hooks fiches (NOUVEAU)

### `src/hooks/useAutoSaveFiche.ts` (ligne 125)
Modifier la logique pour les finisseurs : au lieu de filtrer par `chantier_id = null`, récupérer le `chantierId` depuis les affectations journalières de l'employé.

### `src/hooks/useSaveFiche.ts` (ligne 69-73)
Même logique : pour les finisseurs, utiliser le `chantierId` des affectations.

### `src/hooks/useDeleteFicheJourForAffectation.ts` (ligne 23)
Ce hook reçoit déjà un contexte avec `finisseurId`, `semaine`, et `date`. Il faut ajouter un paramètre `chantierId` et l'utiliser dans la requête.

### `src/hooks/useFinisseursFichesThisWeek.ts` (ligne 23)
Ce hook doit être modifié pour récupérer les fiches finisseurs PAR leurs chantiers affectés au lieu de chercher `chantier_id = null`.

---

## Partie 5 : Modification des hooks copie/init (NOUVEAU)

### `src/hooks/useCopyPreviousWeekFinisseurs.ts` (lignes 88, 103)
Modifier pour :
1. Récupérer le `chantier_id` depuis les nouvelles affectations du finisseur
2. Créer la fiche avec ce `chantier_id` au lieu de `null`

### `src/hooks/useInitializeNextWeekFromPrevious.ts` (lignes 46, 135, 174)
Modifier de manière similaire pour propager le `chantier_id` correctement.

---

## Partie 6 : Modification des composants (NOUVEAU)

### `src/components/conducteur/FinisseursDispatchWeekly.tsx` (ligne 494)
La fonction de suppression d'un finisseur doit être modifiée pour chercher les fiches PAR `chantier_id` (via les affectations) au lieu de chercher `chantier_id = null`.

---

## Partie 7 : Modification de l'appel dans TimeEntryTable

### `src/components/timesheet/TimeEntryTable.tsx` (lignes 897-908)
Modifier `handleTransportFinisseurUpdate` pour :
1. Récupérer le `chantierId` depuis les `affectationsJours` du finisseur
2. Passer ce `chantierId` à `autoSaveTransportFinisseur.mutateAsync`

---

## Section technique

### Stratégie de récupération du `chantierId` pour les finisseurs

Pour les finisseurs, le `chantierId` sera récupéré depuis `affectationsJours` :
1. Filtrer les affectations par `finisseur_id`
2. Prendre le `chantier_id` du premier jour affecté
3. Si aucune affectation, logger un warning et ne pas créer de fiche

```typescript
const getFinisseurChantierId = (
  finisseurId: string, 
  affectationsJours: Array<{ finisseur_id: string; chantier_id: string }>
): string | null => {
  const affectation = affectationsJours.find(a => a.finisseur_id === finisseurId);
  return affectation?.chantier_id || null;
};
```

### Compatibilité descendante

Les fiches existantes avec `chantier_id = null` :
- Le script SQL corrige les 5 fiches S04 identifiées
- Les futures requêtes n'utiliseront plus `.is("chantier_id", null)`
- Les anciennes fiches orphelines resteront en base mais ne seront plus retrouvées (à nettoyer manuellement si besoin)

---

## Résumé des fichiers à modifier

| # | Fichier | Lignes | Modification |
|---|---------|--------|--------------|
| 1 | `src/types/transport.ts` | 111-117 | Ajouter `chantierId: string` |
| 2 | `src/hooks/useAutoSaveTransportFinisseur.ts` | 11, 21, 34, 48 | Utiliser `chantierId` |
| 3 | `src/hooks/useSaveTransportFinisseur.ts` | 11, 21, 33 | Utiliser `chantierId` |
| 4 | `src/hooks/useAutoSaveFiche.ts` | 125 | Remplacer logique finisseur |
| 5 | `src/hooks/useSaveFiche.ts` | 69-73 | Remplacer logique finisseur |
| 6 | `src/hooks/useDeleteFicheJourForAffectation.ts` | 23 | Ajouter paramètre `chantierId` |
| 7 | `src/hooks/useFinisseursFichesThisWeek.ts` | 23 | Requête par chantiers affectés |
| 8 | `src/hooks/useCopyPreviousWeekFinisseurs.ts` | 88, 103 | Utiliser `chantierId` affecté |
| 9 | `src/hooks/useInitializeNextWeekFromPrevious.ts` | 46, 135, 174 | Propager `chantierId` |
| 10 | `src/components/conducteur/FinisseursDispatchWeekly.tsx` | 494 | Chercher par `chantierId` |
| 11 | `src/components/timesheet/TimeEntryTable.tsx` | 897-908 | Passer `chantierId` à l'auto-save |

---

## Estimation de la complexité

- **Fichiers à modifier** : 11
- **Lignes impactées** : ~50-80
- **Risque résiduel** : Faible si tous les fichiers sont modifiés ensemble
- **Tests recommandés** :
  1. Créer un finisseur avec affectation → Vérifier `chantier_id` non null
  2. Copier semaine précédente → Vérifier données copiées correctement
  3. Supprimer un finisseur du dispatch → Vérifier suppression complète
  4. Transmettre les fiches → Vérifier validation réussie

---

## Conclusion

Le plan initial **NE PEUT PAS garantir zéro régression** car il modifie uniquement 3-4 fichiers sur 11+ impactés. Pour garantir une implémentation sans régression, il faut :

1. Modifier TOUS les 11 fichiers listés
2. Exécuter le script SQL pour les données existantes
3. Tester les 4 scénarios critiques

**Recommandation** : Valider ce plan étendu avant implémentation. L'implémentation partielle causerait des bugs difficiles à diagnostiquer.
