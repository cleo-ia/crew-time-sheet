
# Correction de `copyFichesFromPreviousWeek` dans `sync-planning-to-teams`

## Objectif

Corriger la fonction `copyFichesFromPreviousWeek` dans `supabase/functions/sync-planning-to-teams/index.ts` pour qu'elle n'initialise que les jours réellement affectés dans le planning côté conducteur, sans jamais créer de jours fantômes.

## Fichier modifié

Un seul fichier : `supabase/functions/sync-planning-to-teams/index.ts`

---

## Correction 1 — Ajouter `joursPlanning` comme paramètre de la fonction (ligne 871)

La fonction reçoit déjà `chantier` et `entrepriseId` mais pas `joursPlanning`. On l'ajoute :

```
// AVANT
async function copyFichesFromPreviousWeek(
  supabase, employeId, chantierId, previousWeek, currentWeek, chantier, entrepriseId
)

// APRÈS
async function copyFichesFromPreviousWeek(
  supabase, employeId, chantierId, previousWeek, currentWeek, chantier, entrepriseId, joursPlanning: string[]
)
```

---

## Correction 2 — Bug "fiche protégée" côté conducteur (lignes 913–931)

Quand une fiche avec des heures existe déjà (protégée), le code crée une affectation pour chaque jour de la semaine en dur (boucle `for i < 5`). Pour les chantiers sans chef (côté conducteur), on remplace ça par les vrais jours du planning.

```
// AVANT (bugué) — lignes 913-931
} else if (chantier?.conducteur_id) {
  const mondayS = parseISOWeek(currentWeek)
  for (let i = 0; i < 5; i++) {
    const d = new Date(mondayS)
    d.setDate(mondayS.getDate() + i)
    const jour = d.toISOString().split('T')[0]
    await supabase.from('affectations_finisseurs_jours').upsert({ ... })
  }
}

// APRÈS (corrigé)
} else if (chantier?.conducteur_id) {
  for (const jour of joursPlanning) {   // ← vrais jours du planning
    await supabase.from('affectations_finisseurs_jours').upsert({ ... })
  }
}
```

Note importante : la boucle `for i < 5` pour les chefs (lignes 895–912) reste intacte — le mécanisme garde-fou 5 jours côté chef est correct et voulu.

---

## Correction 3 — Bug "copie S-1" : supprimer les jours fantômes après copie (après ligne 1019)

Quand on copie les `fiches_jours` de S-1 vers S, on copie tout sans filtre. Après la boucle de copie, on ajoute une étape de nettoyage : supprimer tous les jours copiés dont la date n'est pas dans `joursPlanning`.

```
// AJOUTER après la boucle de copie (après ligne 1019)
// Nettoyer les jours copiés de S-1 qui ne sont pas dans le planning actuel
const mondayOfWeek = parseISOWeek(currentWeek)
const allWeekDates: string[] = []
for (let i = 0; i < 5; i++) {
  const d = new Date(mondayOfWeek)
  d.setDate(mondayOfWeek.getDate() + i)
  allWeekDates.push(d.toISOString().split('T')[0])
}
if (chantier?.conducteur_id) {
  // Pour les chantiers sans chef, on supprime les jours hors planning
  const datesToDelete = allWeekDates.filter(d => !joursPlanning.includes(d))
  if (datesToDelete.length > 0) {
    await supabase
      .from('fiches_jours')
      .delete()
      .eq('fiche_id', ficheIdS)
      .in('date', datesToDelete)
    console.log(`[sync] Supprimé ${datesToDelete.length} jours fantômes hors planning pour ${employeId}`)
  }
}
```

Ce nettoyage est uniquement conditionné à `chantier?.conducteur_id` — côté chef ça reste inchangé.

---

## Correction 4 — Bug "copie S-1" : affectations côté conducteur basées sur `joursPlanning` (lignes 1051–1066)

Actuellement, les affectations `affectations_finisseurs_jours` créées après la copie sont basées sur les dates de S-1 (variable `jours`) et non sur les jours du planning S. Si S-1 avait des jours fantômes, ils se propagent.

```
// AVANT (bugué) — lignes 1051-1066
} else if (chantier?.conducteur_id) {
  for (const jour of jours) {   // ← dates issues de S-1
    await supabase.from('affectations_finisseurs_jours').upsert({ ... })
  }
}

// APRÈS (corrigé)
} else if (chantier?.conducteur_id) {
  for (const jour of joursPlanning) {   // ← vrais jours du planning S
    await supabase.from('affectations_finisseurs_jours').upsert({ ... })
  }
}
```

Note : le cas `chantier?.chef_id` (lignes 1037–1050) garde la variable `jours` (dates de S-1) — c'est voulu, le garde-fou chef gère la correction ensuite.

---

## Correction 5 — Mettre à jour l'appel à `copyFichesFromPreviousWeek` (ligne 554)

L'appel existant ne passe pas encore `joursPlanning`. On l'ajoute :

```
// AVANT (ligne 554)
const copyResult = await copyFichesFromPreviousWeek(
  supabase, employeId, chantierId, previousWeek, currentWeek, chantier, entrepriseId
)

// APRÈS
const copyResult = await copyFichesFromPreviousWeek(
  supabase, employeId, chantierId, previousWeek, currentWeek, chantier, entrepriseId, joursPlanning
)
```

---

## Ce qui ne change pas

- Toute la logique côté **chefs** (`affectations_jours_chef`) reste intacte
- La fonction `createNewAffectation` n'est pas touchée (déjà correcte)
- La logique de nettoyage des fiches orphelines reste intacte
- Aucune migration de base de données requise
- Aucun changement frontend

## Résultat attendu

Après cette correction, pour tout employé (finisseur, maçon, grutier, intérimaire) affecté à un chantier sans chef géré par un conducteur :
- Planifié **3 jours** → exactement **3** `fiches_jours` + **3** `affectations_finisseurs_jours`
- Les jours fantômes hérités de S-1 sont supprimés automatiquement à chaque sync
- Les totaux d'heures côté RH et conducteur sont corrects
