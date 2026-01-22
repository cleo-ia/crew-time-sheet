
# Plan de correction : Données manquantes pour chantiers sans chef

## Problème identifié

Les `fiches_jours` pour le chantier TEST (sans chef) n'ont jamais été créées car :
- La colonne `entreprise_id` est obligatoire (NOT NULL)
- Le trigger `set_entreprise_from_fiche` existe mais **n'est pas attaché** à la table `fiches_jours`
- La fonction `sync-planning-to-teams` ne fournit pas `entreprise_id` lors de l'upsert

**Résultat** : L'upsert échoue silencieusement, les jours ne sont pas créés, KASMI n'affiche que 23h au lieu de 39h.

## Actions correctives

### Étape 1 : Créer le trigger manquant (migration SQL)

Attacher la fonction `set_entreprise_from_fiche` à la table `fiches_jours` :

```sql
-- Créer le trigger pour auto-peupler entreprise_id sur fiches_jours
CREATE TRIGGER tr_fiches_jours_set_entreprise
  BEFORE INSERT ON public.fiches_jours
  FOR EACH ROW
  EXECUTE FUNCTION public.set_entreprise_from_fiche();
```

### Étape 2 : Corriger sync-planning-to-teams (edge function)

**Fichier** : `supabase/functions/sync-planning-to-teams/index.ts`

Modifier `createNewAffectation` (lignes 651-667) pour :
1. Ajouter gestion d'erreur sur l'upsert
2. Récupérer et passer `entreprise_id` explicitement

```typescript
// Dans createNewAffectation, après création de la fiche
const entrepriseIdForJours = chantier?.entreprise_id || entrepriseId;

for (const jour of joursPlanning) {
  const heuresJour = getHeuresForDay(jour)
  const { error: jourError } = await supabase
    .from('fiches_jours')
    .upsert({
      fiche_id: ficheId,
      date: jour,
      heures: heuresJour,
      HNORM: heuresJour,
      total_jour: heuresJour,
      HI: 0,
      T: 1,
      PA: true,
      pause_minutes: 0,
      entreprise_id: entrepriseIdForJours  // AJOUT
    }, { onConflict: 'fiche_id,date' })
  
  if (jourError) {
    console.error(`[sync] Erreur création fiches_jours pour ${jour}:`, jourError)
    throw jourError
  }
}
```

Même correction pour `copyFichesFromPreviousWeek` (lignes 530-545).

### Étape 3 : Restaurer les données KASMI S05 (SQL one-shot)

```sql
-- Récupérer l'entreprise_id de la fiche TEST
-- Puis insérer les fiches_jours manquantes

INSERT INTO fiches_jours (fiche_id, date, heures, HNORM, total_jour, HI, T, PA, pause_minutes, entreprise_id)
VALUES 
  ('cb2f170b-b04c-4730-80b6-ff24abe3a6b5', '2026-01-26', 8, 8, 8, 0, 1, true, 0, 
   (SELECT entreprise_id FROM fiches WHERE id = 'cb2f170b-b04c-4730-80b6-ff24abe3a6b5')),
  ('cb2f170b-b04c-4730-80b6-ff24abe3a6b5', '2026-01-27', 8, 8, 8, 0, 1, true, 0,
   (SELECT entreprise_id FROM fiches WHERE id = 'cb2f170b-b04c-4730-80b6-ff24abe3a6b5'))
ON CONFLICT (fiche_id, date) DO NOTHING;
```

### Étape 4 : Inclure les fiches BROUILLON dans RH pour chantiers sans chef

**Fichier** : `src/hooks/rhShared.ts`

Ajouter une requête secondaire pour récupérer les fiches des chantiers sans chef (qui restent en BROUILLON car non transmissibles) :

```typescript
// Après la requête fichesAvecChantier (ligne 248)
// Ajouter une requête pour les fiches des chantiers sans chef
let fichesChantiersSansChef: typeof fichesAvecChantier = [];

const { data: fichesSansChef } = await supabase
  .from("fiches")
  .select(`
    id, semaine, statut, salarie_id, chantier_id,
    absences_export_override, trajets_export_override,
    acomptes, prets, commentaire_rh, notes_paie,
    total_saisie, saisie_du_mois, commentaire_saisie,
    regularisation_m1_export, autres_elements_export,
    chantiers!inner(code_chantier, ville, conducteur_id, chef_id, entreprise_id)
  `)
  .is("chantiers.chef_id", null)  // Chantiers sans chef
  .in("statut", ["BROUILLON"])     // Ces fiches ne peuvent pas être transmises
  .eq("chantiers.entreprise_id", entrepriseId);

if (fichesSansChef) {
  fichesChantiersSansChef = fichesSansChef;
}

// Fusionner avec fichesAvecChantier
const toutesLesFiches = [...(fichesAvecChantier || []), ...fichesChantiersSansChef];
```

## Résultat attendu

| Métrique | Avant | Après |
|----------|-------|-------|
| Total KASMI S05 | 23h (3 jours) | 39h (5 jours) |
| Chantiers affichés | LE ROSEYRAN seul | TEST + LE ROSEYRAN |
| Sync planning | Échoue silencieusement | Crée les jours correctement |

## Fichiers impactés

1. **Migration SQL** : Créer trigger `tr_fiches_jours_set_entreprise`
2. `supabase/functions/sync-planning-to-teams/index.ts` : Passer `entreprise_id` + gestion erreurs
3. **Migration SQL** : Insérer les fiches_jours manquantes pour KASMI
4. `src/hooks/rhShared.ts` : Inclure les fiches BROUILLON des chantiers sans chef
