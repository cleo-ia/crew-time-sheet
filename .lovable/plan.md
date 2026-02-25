

## Plan : Generation immediate de la fiche fantome a la creation d'une absence longue duree

### Contexte

Actuellement, quand le RH cree une absence longue duree via le sheet, seule la ligne dans `absences_longue_duree` est inseree. Les fiches fantomes ne sont generees que par le cron `sync-planning-to-teams` le lundi suivant a 5h. Si l'absence commence en milieu de semaine (ex: mercredi S09), la semaine en cours est ratee.

### Solution

Apres l'insertion dans `absences_longue_duree`, generer immediatement la fiche fantome (fiche + fiches_jours) pour la semaine en cours si elle chevauche la date de debut de l'absence. La logique est identique a celle deja presente dans `sync-planning-to-teams` (lignes 1238-1310).

### Modifications

**1. `src/hooks/useAbsencesLongueDuree.ts`** - Ajouter la logique de generation immediate dans `useCreateAbsenceLongueDuree`

Apres le `supabase.from("absences_longue_duree").insert(...)`, enchainer avec :
- Calculer la semaine courante via `getCurrentWeek()` de `src/lib/weekUtils.ts`
- Calculer le lundi et vendredi de cette semaine
- Verifier que l'absence chevauche la semaine (date_debut <= vendredi ET (date_fin null OU date_fin >= lundi))
- Verifier qu'une fiche ghost n'existe pas deja (salarie_id + chantier_id IS NULL + semaine)
- Si pas de doublon : creer la fiche (`statut: ENVOYE_RH`, `chantier_id: null`, `total_heures: 0`)
- Creer les `fiches_jours` pour chaque jour Lun-Ven qui tombe dans la periode (0h, type_absence pre-qualifie, PA false)

La logique replique exactement le bloc du sync (lignes 1238-1310) mais cote client.

**2. Aucune autre modification necessaire**
- Le cron du lundi continuera a gerer les semaines futures (S10+) comme avant
- Le cron verifie deja `existingGhost` donc pas de doublon si la fiche a ete creee immediatement
- Les RLS policies sur `fiches` et `fiches_jours` autorisent deja l'insertion via `user_has_access_to_entreprise` et `get_selected_entreprise_id`

### Detail technique

```text
Creation absence LD (ex: debut 26/02 = mercredi S09)
  |
  v
Insert absences_longue_duree ─── OK
  |
  v
Semaine courante = 2026-S09 (lundi=24/02, vendredi=28/02)
  |
  v
26/02 <= 28/02 ? OUI → chevauche
  |
  v
Fiche ghost existe deja ? NON
  |
  v
Creer fiche: salarie_id, chantier_id=NULL, semaine=2026-S09, statut=ENVOYE_RH
  |
  v
Creer fiches_jours pour: 26/02, 27/02, 28/02 (mer-ven)
  avec type_absence=AT, heures=0, PA=false
  |
  v
Lundi suivant (S10): sync-planning-to-teams genere S10 automatiquement
```

