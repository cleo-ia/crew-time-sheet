
# Correction du récap transport dans l'historique conducteur

## Diagnostic complet des deux bugs

### Bug 1 — RAZOUK : 2 lignes par jour (MATIN + SOIR séparées)

**Cause racine** : La table `fiches_transport_jours` stocke les entrées sur 2 lignes par jour :
- 1 ligne `periode = "MATIN"` avec `conducteur_aller_id`
- 1 ligne `periode = "SOIR"` avec `conducteur_retour_id`

La requête dans `useConducteurHistorique` (ligne 212-221) ne sélectionne **pas** le champ `periode`, donc Supabase retourne les deux lignes brutes pour chaque date. Le `.map()` ligne 253 crée alors une entrée `TransportJourHistorique` par ligne brute → 2 lignes par jour dans l'affichage.

**Résultat visible** : lun 09/02 apparaît 2 fois, mar 10/02 deux fois, etc.

---

### Bug 2 — BOUSHABI VILLEURBANNE : toute la semaine affichée au lieu de 2 jours

**Cause racine** : Le `datesSet` (ligne 197) est construit depuis `datesAffectees` qui correspond à la clé `finisseurId_semaine` dans `affectationDates`. Mais cette Map est construite sans distinction de chantier — elle agrège TOUTES les dates d'affectation de BOUSHABI pour la semaine S07, tous chantiers confondus :

```
affectationDates.get("boushabi_2026-S07") = {09/02, 10/02, 11/02, 12/02, 13/02}
                                              (AMBERIEU)  (VILLEURB) (AMBERIEU) (VILLEURB)
```

Quand la boucle traite la **fiche VILLEURBANNE** de BOUSHABI, elle utilise ce `datesSet` complet de 5 jours pour filtrer les `fiches_transport_jours`. Comme la fiche transport VILLEURBANNE a des entrées pour les 5 jours, le filtre laisse passer tout → 5 jours affichés au lieu de 2.

**La vraie clé de segmentation doit être `finisseurId_semaine_chantierId`**, pas juste `finisseurId_semaine`.

---

## Solution

### Fichier à modifier : `src/hooks/useConducteurHistorique.ts`

#### Correction 1 — Bug MATIN/SOIR (fusion des lignes de transport)

Ajouter le champ `periode` dans la requête et fusionner les lignes par date avant de construire `TransportJourHistorique` :

```typescript
// Requête : ajouter "periode" dans le select
const { data: joursAll } = await supabase
  .from("fiches_transport_jours")
  .select(`
    date,
    periode,        // ← AJOUTER
    immatriculation,
    conducteur_aller:utilisateurs!fiches_transport_jours_conducteur_aller_id_fkey(id, nom, prenom),
    conducteur_retour:utilisateurs!fiches_transport_jours_conducteur_retour_id_fkey(id, nom, prenom)
  `)
  .eq("fiche_transport_id", transportFiche.id)
  .order("date");

// Fusionner MATIN + SOIR par date avant le filtre
const byDate = new Map<string, { date: string; immatriculation: string | null; conducteur_aller: any; conducteur_retour: any }>();

(joursAll || []).forEach((j: any) => {
  if (!byDate.has(j.date)) {
    byDate.set(j.date, { date: j.date, immatriculation: null, conducteur_aller: null, conducteur_retour: null });
  }
  const entry = byDate.get(j.date)!;
  if (j.periode === "MATIN") {
    entry.conducteur_aller = j.conducteur_aller;
    entry.immatriculation = j.immatriculation || entry.immatriculation;
  } else if (j.periode === "SOIR") {
    entry.conducteur_retour = j.conducteur_retour;
    entry.immatriculation = entry.immatriculation || j.immatriculation;
  }
});

// Filtrer les dates consolidées par le datesSet (scopé au bon chantier)
const joursFiltres = Array.from(byDate.values()).filter(j => datesSet.has(j.date));
```

#### Correction 2 — Bug BOUSHABI multi-chantier (datesSet scopé par chantier)

Modifier la Map `affectationDates` pour inclure le `chantier_id` dans la clé :

```typescript
// AVANT (ligne 73-77) :
const key = `${aff.finisseur_id}_${aff.semaine}`;

// APRÈS :
const key = `${aff.finisseur_id}_${aff.semaine}_${aff.chantier_id}`;
```

Et lors de la récupération des dates affectées (ligne 163-164) :

```typescript
// AVANT :
const key = `${fiche.salarie_id}_${fiche.semaine}`;
const datesAffectees = Array.from(affectationDates.get(key)!);

// APRÈS :
const key = `${fiche.salarie_id}_${fiche.semaine}_${fiche.chantier_id}`;
const datesAffectees = Array.from(affectationDates.get(key) ?? new Set<string>());
```

**Avec ce changement**, pour BOUSHABI en S07 :
- Fiche AMBERIEU → `key = "boushabi_2026-S07_AMBERIEU_id"` → datesAffectees = {09/02, 10/02, 12/02}
- Fiche VILLEURBANNE → `key = "boushabi_2026-S07_VILLEURB_id"` → datesAffectees = {11/02, 13/02}

Le filtre transport est alors correctement scopé par chantier.

#### Attention : cas du conducteur lui-même (trajets perso)

Les trajets perso du conducteur lui-même sont ajoutés via `fichesConducteurPerso` (ligne 100-115). Ces entrées n'ont pas de `chantier_id` dans leur clé. Il faut récupérer le `chantier_id` depuis la fiche pour construire la clé correcte :

```typescript
// Ligne 80-115 : ajouter chantier_id dans la requête fichesConducteurPerso
const { data: fichesConducteurPerso } = await supabase
  .from("fiches_jours")
  .select(`
    date, fiche_id, trajet_perso,
    fiches!inner(semaine, salarie_id, statut, chantier_id)  // ← ajouter chantier_id
  `)
  ...

// Et lors de la construction de la key :
const key = `${finisseurId}_${semaine}_${fiche.chantier_id}`;
```

## Périmètre d'impact

- **Fichier unique modifié** : `src/hooks/useConducteurHistorique.ts`
- Aucune modification d'UI, aucune modification en base
- Les données sont correctes en base — c'est uniquement le traitement côté client qui était erroné
- L'historique conducteur sera immédiatement correct pour toutes les semaines passées et futures

## Résultats attendus après correction

| Employé | Chantier | Avant | Après |
|---|---|---|---|
| RAZOUK | AMBERIEU | 10 lignes (2 par jour) | 5 lignes consolidées (1 par jour) |
| BOUSHABI | VILLEURBANNE | 5 jours (toute la semaine) | 2 jours (mer 11/02, ven 13/02) |
| BOUSHABI | AMBERIEU | 3 jours (lun, mar, jeu) ✅ | 3 jours ✅ (inchangé) |
| Tout employé mono-chantier | Quelconque | Inchangé ✅ | Inchangé ✅ |
