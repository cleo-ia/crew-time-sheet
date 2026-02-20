
# Analyse de non-régression : confirmation avant implémentation des corrections R3 et R4

## État actuel du code (après le dernier diff déjà appliqué)

Les correctifs suivants sont déjà en production dans `sync-planning-to-teams` :

- Boucle conducteur sur `joursPlanning` au lieu de `i < 5` (fiche protégée) — ligne 913
- Nettoyage post-copie des jours fantômes de S-1 (suppression BDD) — lignes 1017-1038
- Affectations finisseurs basées sur `joursPlanning` au lieu de `jours` (dates S-1) — ligne 1072

## Ce qui reste à corriger (R3 et R4 confirmés dans le code)

### R3 — total_heures calculé avant le nettoyage (ligne 1042, code actuel)

```typescript
// ⚠️ Bug confirmé — joursS1 contient TOUS les jours de S-1, non filtrés
const totalHeures = joursS1.reduce((sum: number, j: any) => sum + (j.heures || 0), 0)
```

Le nettoyage (lignes 1017-1038) supprime les jours fantômes de la BDD, mais `joursS1` en mémoire n'est pas modifié. Le `total_heures` écrit en BDD reflète donc les 5 jours de S-1, même si 2 jours viennent d'être supprimés.

**Correction : filtrer `joursS1` par les dates `joursPlanning` transposées en S avant de sommer. La variable `daysDiff` existe déjà ligne 1050 pour faire la transposition.**

### R4 — Orphan cleanup sans protection de statut (lignes 807-864, code actuel)

```typescript
// ⚠️ Bug confirmé — select sans statut
.select('id, salarie_id, chantier_id, total_heures')  // statut absent

// ⚠️ Filtre sans protection
const orphanFiches = (allFichesS || []).filter((f: any) => {
  const key = `${f.salarie_id}|${f.chantier_id}`
  return !validEmployeChantierFromPlanning.has(key)  // aucune vérification de statut
})
```

**Même bug confirmé sur `toDeleteChef` (lignes 706-743) et `toDeleteFinisseur` (lignes 746-788)** : les fiches sont sélectionnées avec `select('id, total_heures')` sans `statut`, et supprimées sans aucune protection sur le statut.

## Plan de corrections

### Correction R3 — `total_heures` filtré après nettoyage (ligne 1042)

Calculer `totalHeures` uniquement pour les jours de S-1 dont la date transposée en S est dans `joursPlanning`. La variable `daysDiff` (différence en ms entre les deux lundis) est déjà calculée ligne 963 dans la fonction.

```typescript
// Calculer daysDiff avant la boucle de copie (déjà présent ligne 963)
const mondayS1 = parseISOWeek(previousWeek)
const mondayS = parseISOWeek(currentWeek)
const daysDiff = mondayS.getTime() - mondayS1.getTime()

// APRÈS le nettoyage, remplacer ligne 1042 par :
const totalHeures = chantier?.conducteur_id
  ? (joursS1 as any[])
      .filter((j: any) => {
        const oldDate = new Date(j.date)
        const newDate = new Date(oldDate.getTime() + daysDiff)
        return joursPlanning.includes(newDate.toISOString().split('T')[0])
      })
      .reduce((sum: number, j: any) => sum + (j.heures || 0), 0)
  : (joursS1 as any[]).reduce((sum: number, j: any) => sum + (j.heures || 0), 0)
```

Les chefs gardent le calcul d'origine (5 jours intacts). Seuls les conducteurs bénéficient du filtre.

### Correction R4 — Protection statut dans les 3 phases de suppression

**Phase 1 — `toDeleteChef` (ligne 707)** : ajouter `statut` dans le select + protection avant suppression de la fiche.

**Phase 2 — `toDeleteFinisseur` (ligne 751)** : même ajout.

**Phase 3 — orphan cleanup (ligne 809)** : ajouter `statut` dans le select + filtre de protection.

Statuts protégés dans les 3 phases :
```typescript
const STATUTS_PROTEGES = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
```

Note : `VALIDE_CHEF` est ajouté par sécurité — si un chef a validé, cela vaut la peine de protéger même si la fiche n'est pas encore transmise.

Pour chaque phase, la fiche est sautée si son statut est dans `STATUTS_PROTEGES` (log de l'action pour traçabilité).

## Garantie de non-régression

### Pages non impactées (zéro changement frontend)

Toutes les corrections sont exclusivement dans l'Edge Function `sync-planning-to-teams`. Aucun fichier frontend n'est modifié.

- `/consultation-rh` : aucun changement de code, les données lues en BDD seront plus correctes (R3)
- `/validation-conducteur` : aucun changement de code, idem
- `/planning-main-oeuvre` : aucun changement
- `/signature-macons`, `/signature-finisseurs` : aucun changement
- Pages chantier, admin, etc. : aucun changement

### Comportement côté chefs (inchangé)

- R3 : les chefs gardent le chemin `else` du ternaire → calcul identique à aujourd'hui
- R4 : la protection statut ne fait que **réduire** le périmètre des suppressions → moins agressif, jamais plus agressif

### Comportement côté conducteurs (amélioré)

- R3 : `total_heures` en BDD sera désormais cohérent avec le nombre de jours réellement présents dans `fiches_jours`
- R4 : les fiches `ENVOYE_RH` ou `VALIDE_CONDUCTEUR` ne seront plus supprimées si le planning change

### Aucune régression possible

Les deux corrections sont **exclusivement restrictives** :
- R3 ne change qu'un calcul arithmétique (moins de jours comptés pour le conducteur, même résultat pour le chef)
- R4 ne fait qu'ajouter une condition `if (STATUTS_PROTEGES.includes(f.statut)) continue` — cela réduit le nombre de suppressions, n'en ajoute jamais

Il n'y a aucun chemin de code où ces corrections pourraient créer une nouvelle suppression, un nouveau doublon ou un conflit de données. La seule "perte de fonctionnalité" est intentionnelle : des fiches validées ne seront plus supprimées par erreur.

## Fichier modifié

Un seul fichier : `supabase/functions/sync-planning-to-teams/index.ts`

4 zones modifiées, toutes dans la même fonction `syncEntreprise` et dans `copyFichesFromPreviousWeek` :
1. Ligne 707 : `select` phase chef → ajouter `statut`
2. Ligne 726 : filtre suppression chef → ajouter protection statut
3. Ligne 751 : `select` phase finisseur → ajouter `statut`
4. Ligne 770 : filtre suppression finisseur → ajouter protection statut
5. Ligne 809 : `select` orphan cleanup → ajouter `statut`
6. Ligne 819 : filtre orphan cleanup → ajouter protection statut
7. Ligne 1042 : calcul `totalHeures` → filtrer par `joursPlanning` pour conducteur uniquement
