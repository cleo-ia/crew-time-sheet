

## Plan : Elargir la protection des statuts dans le bloc chef secondaire (ligne 898)

### Fichier : `supabase/functions/sync-planning-to-teams/index.ts`

**Modification unique, ligne 898 :**

```
Avant :  const STATUTS_PROTEGES_CHEF = ['CLOTURE']
Après :  const STATUTS_PROTEGES_CHEF = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
```

Et dans le bloc `if` qui suit (lignes 899-903), ajouter la creation des `affectations_jours_chef` avant le `continue` pour maintenir la visibilite equipe meme quand la fiche est protegee :

```typescript
if (ficheChefSec && STATUTS_PROTEGES_CHEF.includes(ficheChefSec.statut)) {
  // Créer les affectations pour la visibilité équipe
  for (const jour of joursPlanning) {
    await supabase
      .from('affectations_jours_chef')
      .upsert({
        macon_id: employeId,
        chef_id: employeId,
        chantier_id: chantierId,
        jour,
        semaine: currentWeek,
        entreprise_id: entrepriseId
      }, { onConflict: 'macon_id,jour,chantier_id' })
  }
  stats.protected++
  continue
}
```

### Scenario concret protege

Lundi matin la sync auto tourne et cree les fiches BROUILLON. Mercredi le chef signe sa fiche (VALIDE_CHEF). Jeudi le conducteur relance une sync manuelle → la fiche signee est preservee, seules les affectations equipe sont mises a jour.

### Pas de regression

- Fiches BROUILLON : pas dans la liste → ecrasees normalement
- Macons/grutiers/interimaires : ne passent pas par ce bloc
- Visibilite equipe : garantie par l'upsert des affectations

