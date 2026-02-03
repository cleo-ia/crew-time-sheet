
# Plan de correction : Suppression des copies S→S+1 redondantes

## Contexte du problème

Les deux mécanismes de copie automatique S→S+1 créent des conflits avec le nouveau flux Planning Main d'Œuvre :

| Hook | Déclenché par | Ce qu'il copie | Conflit avec Planning Sync |
|------|---------------|----------------|---------------------------|
| `useInitializeNextWeekFromPrevious` | Signature maçons | Fiches + Transport | Équipes + Heures en double |
| `useCopyAllDataFinisseurs` | Signature finisseurs | Affectations + Fiches + Transport | Affectations + Heures en double |

La **sync Planning** (lundi 5h) est désormais la **source de vérité** pour :
- Les équipes (affectations)
- Les heures de base (héritage S-1 ou défaut)

---

## Analyse des risques de conflit

### Flux Maçons (`useInitializeNextWeekFromPrevious`)
- **Copie les fiches (équipes)** → Conflit avec sync Planning qui gère les équipes
- **Copie les heures saisies** → Écrase potentiellement les heures initialisées par le planning
- **Copie le transport** → Risque d'incohérence si l'équipe/véhicule change

### Flux Finisseurs (`useCopyAllDataFinisseurs`)
- **Copie les affectations_finisseurs_jours** → Conflit direct avec sync Planning
- **Copie les fiches + heures** → Écrase potentiellement les heures initialisées par le planning
- **Copie le transport finisseurs** → Risque d'incohérence si l'équipe/véhicule change

---

## Solution proposée

### Modifications à effectuer

**1. `src/pages/SignatureMacons.tsx`**
- Supprimer l'appel à `initializeNextWeek.mutateAsync()` dans `handleFinish`
- Supprimer l'import du hook `useInitializeNextWeekFromPrevious`
- Conserver : validation statut, notification conducteur, redirection S+1

**2. `src/pages/SignatureFinisseurs.tsx`**
- Supprimer l'appel à `copyAllDataFinisseurs.mutateAsync()` dans `handleSubmit`
- Supprimer l'import du hook `useCopyAllDataFinisseurs`
- Conserver : signatures, mise à jour statut ENVOYE_RH, injection congés, redirection S+1

**3. Fichiers à supprimer (obsolètes)**
- `src/hooks/useInitializeNextWeekFromPrevious.ts`
- `src/hooks/useCopyAllDataFinisseurs.ts`
- `src/hooks/useInitializeNextWeek.ts` (non utilisé)
- `src/hooks/useInitializeNextWeekMacons.ts` (non utilisé)

---

## Impact sur chaque page

| Page | Avant | Après |
|------|-------|-------|
| `SignatureMacons.tsx` | Copie fiches+transport → S+1 | Validation + notification uniquement |
| `SignatureFinisseurs.tsx` | Copie affectations+fiches+transport → S+1 | Validation + ENVOYE_RH uniquement |
| Planning Sync | Source secondaire | **Unique source de vérité** pour équipes/heures |
| Transport (maçons) | Copie automatique | Manuel via bouton "Copier S-1" existant |
| Transport (finisseurs) | Copie automatique | Manuel via bouton "Copier S-1" existant |

---

## Boutons de copie manuelle (conservés)

Les chefs et conducteurs gardent la possibilité de copier le transport manuellement si souhaité :

- **Maçons** : `TransportSheetV2.tsx` → hook `useCopyPreviousWeekTransport`
- **Finisseurs** : `FinisseursDispatchWeekly.tsx` → hook `useCopyPreviousWeekFinisseurs`

Ces boutons permettent de pré-remplir le transport sans automatisme potentiellement incorrect.

---

## Flux après correction

```text
SEMAINE S (signature)
┌────────────────────────────────────────────┐
│ 1. Chef signe équipe maçons                │
│    → Statut = VALIDE_CHEF                  │
│    → Notification conducteur               │
│    → Redirection vers S+1 (vide ou sync)   │
│                                            │
│ 2. Conducteur signe équipe finisseurs      │
│    → Statut = ENVOYE_RH                    │
│    → Injection congés validés              │
│    → Redirection vers S+1 (vide ou sync)   │
└────────────────────────────────────────────┘

LUNDI 5H (sync Planning)
┌────────────────────────────────────────────┐
│ • Planning S validé?                       │
│   → OUI: Sync équipes + heures → S         │
│   → NON: Skip entreprise                   │
└────────────────────────────────────────────┘
```

---

## Récapitulatif des fichiers modifiés

1. **`src/pages/SignatureMacons.tsx`** : Retirer bloc copie S→S+1 (lignes 213-228)
2. **`src/pages/SignatureFinisseurs.tsx`** : Retirer bloc copie S→S+1 (lignes 333-341)
3. **Suppression** : 4 hooks obsolètes

---

## Absence de régression

- Le flux de validation (statuts, notifications) reste intact
- Les redirections vers S+1 fonctionnent toujours
- Le transport peut être copié manuellement si nécessaire
- La sync Planning reste la seule source pour les équipes/heures
- Aucune autre page n'utilise ces hooks
