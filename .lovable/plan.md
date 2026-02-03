
# ✅ TERMINÉ : Suppression des copies S→S+1 redondantes

## Résumé des modifications effectuées

### 1. SignatureMacons.tsx
- ✅ Supprimé l'import de `useInitializeNextWeekFromPrevious`
- ✅ Supprimé l'appel à `initializeNextWeek.mutateAsync()` dans `handleFinish`
- ✅ Conservé : validation statut, notification conducteur, redirection S+1

### 2. SignatureFinisseurs.tsx
- ✅ Supprimé l'import de `useCopyAllDataFinisseurs`
- ✅ Supprimé l'appel à `copyAllDataFinisseurs.mutateAsync()` dans `handleSubmit`
- ✅ Conservé : signatures, mise à jour statut ENVOYE_RH, injection congés, redirection S+1

### 3. Fichiers supprimés (obsolètes)
- ✅ `src/hooks/useInitializeNextWeekFromPrevious.ts`
- ✅ `src/hooks/useCopyAllDataFinisseurs.ts`
- ✅ `src/hooks/useInitializeNextWeek.ts`
- ✅ `src/hooks/useInitializeNextWeekMacons.ts`

---

## Nouveau flux après correction

| Étape | Action | Source de vérité |
|-------|--------|------------------|
| Signature maçons | Validation + notification | Planning Sync |
| Signature finisseurs | Validation + ENVOYE_RH | Planning Sync |
| Lundi 5h | Sync Planning → équipes/heures | Unique |
| Transport | Manuel via bouton "Copier S-1" | Chef/Conducteur |

---

## Boutons de copie manuelle (conservés)

- **Maçons** : `TransportSheetV2.tsx` → `useCopyPreviousWeekTransport`
- **Finisseurs** : `FinisseursDispatchWeekly.tsx` → `useCopyPreviousWeekFinisseurs`
