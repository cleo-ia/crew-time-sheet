

# Plan : Ajouter un sélecteur de semaine pour la synchronisation manuelle

## Objectif
Permettre de choisir la semaine cible (S-2 à S+2) lors du déclenchement manuel de la synchronisation "Planning → Équipes" depuis l'interface admin.

## Modification unique

### Fichier : `src/components/admin/RappelsManager.tsx`

**Changements :**

1. **Ajouter un état local pour la semaine sélectionnée**
   - Initialiser à S+1 (comportement par défaut actuel)
   - Type : `string` (format YYYY-SWW)

2. **Générer les options de semaine**
   - Calculer les semaines de S-2 à S+2 (5 options)
   - Utiliser les fonctions existantes `getCurrentWeek()`, `getNextWeek()`, `getPreviousWeek()` de `weekUtils.ts`

3. **Ajouter un composant Select dans la carte de synchronisation**
   - Positionnement : dans la zone des informations (entre "Génère automatiquement..." et le bouton)
   - Affichage : Select dropdown avec les 5 semaines disponibles
   - Label : "Semaine cible"

4. **Mettre à jour l'appel du bouton**
   - Remplacer `syncPlanningToTeams(targetWeek)` par `syncPlanningToTeams(selectedSyncWeek)`
   - Le texte du bouton affichera la semaine sélectionnée dynamiquement

## Impact sur le CRON automatique

**Aucun** - Le CRON continue d'appeler l'Edge Function sans paramètre `semaine`, donc utilise `getCurrentWeek()` par défaut (comportement inchangé).

## Détails techniques

```
┌─────────────────────────────────────────────────────────────┐
│  Sync Planning → Équipes                            [Actif] │
├─────────────────────────────────────────────────────────────┤
│  Génère automatiquement les équipes depuis le planning      │
│                                                             │
│  🕐 Tous les lundis à 05h00 (heure de Paris)               │
│  📅 Adaptation automatique heure d'été/hiver               │
│                                                             │
│  Semaine cible : [▼ 2026-S06 ▼]                            │
│                  ├─ 2026-S04 (S-2)                         │
│                  ├─ 2026-S05 (S-1)                         │
│                  ├─ 2026-S06 (S)                           │
│                  ├─ 2026-S07 (S+1) ← défaut actuel         │
│                  └─ 2026-S08 (S+2)                         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  🔄 Synchroniser 2026-S06                             │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Validation

Après implémentation :
1. Aller sur `/admin?tab=rappels`
2. Sélectionner "2026-S06" dans le sélecteur
3. Cliquer sur "Synchroniser 2026-S06"
4. Vérifier que les équipes sont créées pour la bonne semaine

