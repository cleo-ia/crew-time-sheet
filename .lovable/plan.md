

## Plan : Corriger la visibilite des fiches ghost (absences longue duree) dans la consolidation RH

### Probleme

La requete principale dans `rhShared.ts` (ligne 205-237) utilise `chantiers!inner(...)` qui exclut toutes les fiches avec `chantier_id = NULL`. Les fiches ghost d'absences longue duree sont donc invisibles dans toute la chaine RH (consolidation, pre-export, export Excel, detail employe).

### Solution

Ajouter une deuxieme requete dans `buildRHConsolidation` pour recuperer les fiches ghost (`chantier_id IS NULL`) et les fusionner avec les fiches normales.

### Modifications

**1. `src/hooks/rhShared.ts` - `buildRHConsolidation()`**

Apres la requete principale `fichesAvecChantier` (ligne 274), ajouter une requete complementaire :

```typescript
// Requete 2 : fiches ghost (absences longue duree, chantier_id = NULL)
let fichesGhostQuery = supabase
  .from("fiches")
  .select(`id, semaine, statut, salarie_id, chantier_id, entreprise_id, ...`)
  .is("chantier_id", null)
  .in("statut", ["ENVOYE_RH", "AUTO_VALIDE", ...]);

const { data: fichesGhost } = await fichesGhostQuery;
```

Fusionner `fichesAvecChantier` et `fichesGhost` dans `toutesLesFiches` (ligne 278).

Pour les fiches ghost, les champs chantier (`code_chantier`, `ville`, etc.) seront `null` ou vides - adapter le mapping dans la boucle d'agregation (lignes 434+) pour gerer ce cas.

**2. Adapter le mapping employe pour les fiches sans chantier**

Dans la boucle `for (const [salarieId, fiches])` :
- Si la fiche n'a pas de `chantiers` (ghost), utiliser un code chantier vide ou un libelle type "Absence LD"
- Les `detailJours` auront `chantierCode: ""` et `chantierVille: ""`
- Le `type_absence` sera deja renseigne dans `fiches_jours`

**3. Bonus mineur : `useAbsencesLongueDuree.ts` - Aligner les champs avec le sync**

Ajouter les champs manquants dans les `fiches_jours` crees par le hook client pour coherence avec le sync :
- `HNORM: 0`, `HI: 0`, `T: 0`, `pause_minutes: 0`
- `code_trajet: null`, `code_chantier_du_jour: null`, `ville_du_jour: null`, `repas_type: null`

### Impact

- La vue consolidee RH affichera le salarie en absence LD avec ses jours pre-qualifies
- Le pre-export et l'export Excel incluront ces absences
- Le detail employe montrera les jours d'absence avec le bon type
- Aucun impact sur les fiches normales (avec chantier)

### Detail technique

```text
buildRHConsolidation()
  |
  v
Requete 1 : fiches avec chantier_id NOT NULL (inner join chantiers) ─── existant
  |
  v
Requete 2 : fiches avec chantier_id IS NULL (ghost absences LD) ─── NOUVEAU
  |
  v
Fusion : toutesLesFiches = [...fichesAvecChantier, ...fichesGhost]
  |
  v
Filtrage par mois/semaine (identique)
  |
  v
Agregation par salarie : 
  - Si fiche.chantier_id = null → chantierCode = "" (ou "ABS-LD")
  - Les fiches_jours ont deja type_absence renseigne
  |
  v
Resultat : employe visible en RH avec absences pre-qualifiees
```

