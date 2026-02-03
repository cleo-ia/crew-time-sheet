
# ✅ Plan TERMINÉ : Correction du badge "Absent" pour les chefs multi-chantier sur leurs chantiers secondaires

## Contexte du problème (résolu)

Philippe DURAND est un chef de chantier affecté à plusieurs sites :
- **Chantier principal** : COEUR DE BALME EST (où ses heures sont comptabilisées)
- **Chantier secondaire** : LE ROSEYRAN (où il gère une équipe mais ne saisit pas SES heures)

La synchronisation du planning supprimait volontairement les `fiches_jours` du chef sur son chantier secondaire pour éviter les doublons RH, mais l'UI affichait "Absent" car elle interprétait `HNORM=0, HI=0` comme une absence.

---

## Solution implémentée

### 1. Edge Function : `sync-planning-to-teams/index.ts` ✅

**Modification** : Lors du nettoyage des heures du chef sur son chantier secondaire, on **supprime maintenant la fiche ET les fiches_jours** (pas seulement reset à 0h).

- Suppression des `fiches_jours` (clé étrangère)
- Suppression des `signatures` (clé étrangère)  
- Suppression de la `fiche` elle-même
- Le chef n'a plus AUCUNE donnée sur son chantier secondaire → pas de risque d'être interprété comme "absent"

### 2. UI : `TimeEntryTable.tsx` ✅

**Modification** : Ajout du flag `isSecondaryChefDay?: boolean` dans le type `DayData` pour distinguer les 0h par design des vraies absences.

- Les jours du chef sur un chantier secondaire sont marqués `absent: false` et `isSecondaryChefDay: true`
- L'UI peut ainsi afficher un message explicatif au lieu d'un badge "Absent"

### 3. UI : `SignatureMacons.tsx` ✅

**Modification** : Affichage conditionnel du badge heures :

- Chef sur chantier secondaire avec 0h → Badge **"Chantier principal"** en bleu
- Autres employés avec 0h → Badge **"Absent"** en rouge (comportement inchangé)

### 4. Hook : `useMaconsByChantier.ts`

Pas de modification nécessaire - le hook retourne déjà `null` pour la fiche du chef sur le secondaire puisqu'elle est supprimée.

---

## Comportement après correction

### Sur l'écran de saisie (TimeEntryTable)
- Chef sur chantier secondaire : jours verrouillés avec message "🔒 Saisie sur votre chantier principal uniquement"
- **Pas de badge "Absent"**
- Fond bleu clair au lieu de rouge

### Sur l'écran de signature (SignatureMacons)
- Chef sur chantier secondaire : badge **"Chantier principal"** en bleu au lieu de **"Absent"** en rouge
- Le bandeau d'avertissement "Heures indicatives" reste visible

### En base de données
- Chef sur chantier secondaire : **aucune fiche, aucun fiches_jours**
- Seules les `affectations_jours_chef` existent (pour le routage de l'équipe vers ce chef)
- Aucune donnée qui pourrait être interprétée comme "absent"

---

## Fichiers modifiés

| Fichier | Statut |
|---------|--------|
| `supabase/functions/sync-planning-to-teams/index.ts` | ✅ Déployé |
| `src/components/timesheet/TimeEntryTable.tsx` | ✅ Modifié |
| `src/pages/SignatureMacons.tsx` | ✅ Modifié |

---

## Pour valider la correction

1. Relancer la synchronisation planning via Admin > Rappels > "Synchroniser maintenant"
2. Vérifier que la fiche de Philippe DURAND sur LE ROSEYRAN a bien été supprimée
3. Vérifier l'affichage sur la page de signature - doit afficher "Chantier principal" au lieu de "Absent"
