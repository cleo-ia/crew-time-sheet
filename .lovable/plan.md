
# Plan : Correction du badge "Absent" pour les chefs multi-chantier sur leurs chantiers secondaires

## Contexte du problème

Philippe DURAND est un chef de chantier affecté à plusieurs sites :
- **Chantier principal** : COEUR DE BALME EST (où ses heures sont comptabilisées)
- **Chantier secondaire** : LE ROSEYRAN (où il gère une équipe mais ne saisit pas SES heures)

La synchronisation du planning (`sync-planning-to-teams`) **supprime volontairement** les `fiches_jours` du chef sur son chantier secondaire pour éviter les doublons RH. Cependant, cela crée un effet de bord : l'UI affiche "Absent" car elle interprète `HNORM=0, HI=0` comme une absence.

**Le problème** : Le chef n'est PAS absent - il travaille sur son chantier principal. L'affichage "Absent" est donc **sémantiquement incorrect**.

---

## Solution proposée

### Approche : Ne pas créer de `fiches_jours` pour les chefs sur leurs chantiers secondaires

Plutôt que de créer des entrées avec 0h qui sont interprétées comme "absent", la solution est de **ne pas créer de `fiches_jours` du tout** pour les chefs sur leurs chantiers secondaires. L'UI affichera alors un message explicatif au lieu d'un badge "Absent".

---

## Modifications techniques

### 1. Edge Function : `sync-planning-to-teams`

**Fichier** : `supabase/functions/sync-planning-to-teams/index.ts`

**Modification** : Lors du nettoyage des heures du chef sur son chantier secondaire, **supprimer également la fiche elle-même** (pas seulement les `fiches_jours`).

```text
Lignes ~491-523 actuelles :
- Supprime les fiches_jours
- Met total_heures = 0 sur la fiche

Nouveau comportement :
- Supprime les fiches_jours ET la fiche elle-même
- Ne crée AUCUNE donnée pour le chef sur le chantier secondaire
- Garde uniquement les affectations_jours_chef pour le routage de l'équipe
```

### 2. UI : `TimeEntryTable.tsx`

**Fichier** : `src/components/timesheet/TimeEntryTable.tsx`

**Modification 1** : Dans l'initialisation des données par défaut (lignes ~580-598), pour le chef sur un chantier secondaire, ne pas créer d'entrées avec `absent: false` et 0h. À la place, créer des entrées avec un nouveau flag `isSecondaryReadOnly: true` qui sera affiché différemment.

**Modification 2** : Ajouter un nouveau type de flag dans `DayData` pour distinguer les vrais absents des jours non-travaillés par design :
```typescript
type DayData = {
  // ... existant ...
  isSecondaryChefDay?: boolean; // Chef sur chantier secondaire = 0h par design
};
```

**Modification 3** : Dans l'affichage (lignes ~1430-1465), si `isSecondaryChefDay === true`, ne PAS afficher le checkbox "Absent" et afficher un badge spécifique "Heures sur chantier principal".

### 3. UI : `SignatureMacons.tsx`

**Fichier** : `src/pages/SignatureMacons.tsx`

**Modification** : Lignes ~476-482, ajouter une condition pour ne pas afficher "Absent" pour le chef lui-même quand il est sur un chantier secondaire :

```typescript
// Avant
{jour.HNORM === 0 && jour.HI === 0 ? (
  <Badge>Absent</Badge>
) : ...}

// Après
{isChefOnSecondaryChantier && selectedMacon.isChef ? (
  <Badge className="bg-blue-50 text-blue-700">Chantier principal</Badge>
) : jour.HNORM === 0 && jour.HI === 0 ? (
  <Badge>Absent</Badge>
) : ...}
```

### 4. Hook : `useMaconsByChantier.ts`

**Fichier** : `src/hooks/useMaconsByChantier.ts`

**Modification** : Quand on charge les données du chef sur un chantier secondaire (pas de `ficheJours` car supprimés), **ne pas retourner de jours vides** qui seraient interprétés comme absences. Vérifier si c'est le chef et si le chantier n'est pas son principal avant de déclencher des alertes.

---

## Résumé des changements

| Fichier | Action |
|---------|--------|
| `sync-planning-to-teams/index.ts` | Supprimer fiche + fiches_jours (pas juste reset à 0) |
| `TimeEntryTable.tsx` | Ajouter flag `isSecondaryChefDay`, affichage dédié |
| `SignatureMacons.tsx` | Badge "Chantier principal" au lieu de "Absent" |
| `useMaconsByChantier.ts` | Gestion du cas chef sans ficheJours sur secondaire |

---

## Comportement attendu après correction

### Sur l'écran de saisie (TimeEntryTable)
- Chef sur chantier secondaire : jours verrouillés avec message "🔒 Saisie sur votre chantier principal uniquement"
- **Pas de badge "Absent"**
- **Pas de checkbox "Absent" affiché**
- Fond bleu clair (déjà en place) au lieu de rouge

### Sur l'écran de signature (SignatureMacons)
- Chef sur chantier secondaire : badge **"Heures sur chantier principal"** en bleu au lieu de **"Absent"** en rouge
- Le bandeau d'avertissement existant reste visible

### En base de données
- Chef sur chantier secondaire : **aucune fiche, aucun fiches_jours**
- Seules les `affectations_jours_chef` existent (pour le routage de l'équipe vers ce chef)
- Aucune donnée qui pourrait être interprétée comme "absent"

---

## Risques et mitigation

| Risque | Mitigation |
|--------|------------|
| Chef sans fiche = erreur à la signature | Vérifier l'existence de la fiche avant signature, afficher message explicatif si absent |
| RH ne voit plus le chef sur le chantier secondaire | C'est le comportement attendu - ses heures sont sur le principal uniquement |
| Régression sur les autres rôles | Les modifications sont conditionnées par `isChef && isChantierSecondaire` |
