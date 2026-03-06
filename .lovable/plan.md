

# Plan : Paie Previsionnelle basee sur la Semaine Socle

## Resume

Quand le RH exporte la paie vers le 20 du mois, les jours restants du mois (semaine 4, voire semaine 5) ne sont pas encore saisis. Le systeme va automatiquement "predire" ces jours en copiant la derniere semaine completement saisie du mois (la "Semaine Socle"). A la cloture, un snapshot de ces estimations est sauvegarde. Le mois suivant, le delta entre les valeurs reelles (saisies entre-temps) et les estimations est calcule et affiche automatiquement.

---

## Etape 1 : Migration base de donnees

### Table `periodes_cloturees` — ajouter une colonne snapshot

```sql
ALTER TABLE periodes_cloturees 
ADD COLUMN snapshot_estimations jsonb DEFAULT NULL;
```

Ce champ stockera pour chaque salarie les jours estimes :
```json
{
  "salarie_id_1": [
    { "date": "2026-02-23", "heures": 8, "panier": true, "code_trajet": "T3", "is_estimated": true },
    ...
  ],
  ...
}
```

### Table `utilisateurs` — pas de modification

On utilise les champs existants : `chantier_principal_id` (pour le code trajet fallback) et `role_metier` (pour detecter les apprentis via chantier `is_ecole`).

---

## Etape 2 : Logique de generation des jours virtuels dans `buildRHConsolidation`

**Fichier : `src/hooks/rhShared.ts`**

Ajouter une nouvelle fonction `generateEstimatedDays` appelee dans `buildRHConsolidation` quand `filters.periode` est defini.

### Logique :

1. **Identifier les jours ouvrables du mois** (lundi-vendredi, du 1er au dernier jour du mois civil)

2. **Pour chaque salarie**, apres avoir collecte ses `detailJours` reels :
   - Lister les dates du mois qui **n'ont pas** de `fiches_jours` reel
   - Si aucun jour manquant → rien a faire

3. **Trouver la Semaine Socle** : la derniere semaine ISO du mois ou le salarie a **au moins 1 jour avec heures > 0** et dont tous les jours ouvrables ont des donnees saisies

4. **Regle de securite (fallback optimiste)** :
   - **Cas normal** (salarie present en Semaine Socle, heures > 0) : dupliquer les paniers, codes trajets, et heures de la Semaine Socle pour chaque jour manquant (lundi→lundi, mardi→mardi, etc.)
   - **Cas absence en Semaine Socle** (0h ou absence) : generer des jours "optimistes" avec 8h (lun-jeu) / 7h (ven), panier=true, code trajet = celui du chantier principal du salarie (via `chantier_principal_id` → `chantiers.code_chantier` pour determiner la zone) ou `T1` par defaut
   - **Cas apprenti** (salarie affecte a un chantier `is_ecole`) : generer 7h/jour sans panier ni trajet

5. **Marquer** chaque jour genere avec `is_estimated: true` (nouveau champ dans `EmployeeDetail`)

### Interface `EmployeeDetail` — ajout :
```typescript
is_estimated?: boolean; // true si jour genere par la paie previsionnelle
```

---

## Etape 3 : Snapshot a la cloture

**Fichier : `src/hooks/useRHData.ts`** — dans `useCloturePeriode`

Avant d'inserer dans `periodes_cloturees`, appeler `buildRHConsolidation` et extraire tous les jours marques `is_estimated: true`. Sauvegarder ce snapshot dans la nouvelle colonne `snapshot_estimations`.

```typescript
// Construire le snapshot des estimations
const snapshot: Record<string, any[]> = {};
consolidatedEmployees.forEach(emp => {
  const estimated = emp.detailJours.filter(j => j.is_estimated);
  if (estimated.length > 0) {
    snapshot[emp.salarieId] = estimated.map(j => ({
      date: j.date, heures: j.heures, panier: j.panier,
      code_trajet: j.trajet, intemperie: j.intemperie,
    }));
  }
});
```

Ajouter `snapshot_estimations: Object.keys(snapshot).length > 0 ? snapshot : null` dans l'insert.

---

## Etape 4 : Regularisation automatique M-1

**Fichier : `src/hooks/rhShared.ts`** — nouvelle fonction `calculateRegularisationM1`

Quand `buildRHConsolidation` est appele pour le mois M :

1. Charger le snapshot du mois M-1 depuis `periodes_cloturees`
2. Pour chaque salarie present dans le snapshot :
   - Recuperer les `fiches_jours` **reelles** pour les dates estimees
   - Calculer le delta : `reel - estime` pour heures, paniers, trajets
3. Injecter le resultat dans `EmployeeWithDetails.regularisation_m1_export` sous forme lisible

### Format du delta :

```
"H: -7h | PA: -2 | T3→T5: 3j"
```

Signifie : 7h de moins que prevu, 2 paniers en moins, 3 jours ou le trajet etait T3 (estime) mais en realite T5.

---

## Etape 5 : Affichage dans RHPreExport

**Fichier : `src/components/rh/RHPreExport.tsx`**

- La colonne `regularisation_m1_export` existe deja dans le tableau
- Elle sera automatiquement remplie par la logique de l'etape 4
- Ajouter un **tooltip au survol** qui detaille jour par jour : "23/02 : Estime 8h T3 PA → Reel 0h (Absent CP)"
- Les jours estimes dans le mois courant seront affiches avec un fond colore distinct (ex: bleu clair) pour que le RH les identifie visuellement

---

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/hooks/rhShared.ts` | Fonction `generateEstimatedDays`, integration dans `buildRHConsolidation`, fonction `calculateRegularisationM1`, ajout `is_estimated` dans `EmployeeDetail` |
| `src/hooks/useRHData.ts` | Snapshot des estimations dans `useCloturePeriode` |
| `src/hooks/useRHExport.ts` | Propagation du champ `is_estimated` dans `detailJours` |
| `src/components/rh/RHPreExport.tsx` | Tooltip regularisation + fond colore jours estimes |
| Migration SQL | Colonne `snapshot_estimations` sur `periodes_cloturees` |

---

## Ce qui ne change PAS

- Le workflow de saisie des chefs et conducteurs
- Les fiches existantes et leur statut
- L'export Excel final (il integre deja `regularisation_m1_export`)
- La logique de cloture existante (on ajoute juste le snapshot)

