

## Probleme confirme

La contrainte unique sur `affectations_jours_chef` est `(macon_id, jour)` -- un seul enregistrement par personne par jour, **quel que soit le chantier**. Voici ce qui se passe dans l'ordre durant la sync :

1. **Ligne 982-993** : La sync cree les affectations du chef sur son chantier secondaire avec `onConflict: 'macon_id,jour'`
2. **Ligne 1088-1107** : Le garde-fou supprime toutes les affectations du chef ou `chantier_id != chantier_principal_id`
3. **Ligne 1109-1121** : Le garde-fou force 5 affectations sur le chantier principal avec `onConflict: 'macon_id,jour'` -- ce qui **ecrase** les secondaires si elles existaient encore

Resultat : la fiche et les fiches_jours du chef sur le chantier secondaire existent bien (DAVOULT), mais les `affectations_jours_chef` sont supprimees. Sans ces affectations, `useMaconsByChantier` ne trouve pas le chef sur ce chantier, le flux de signature/transmission echoue silencieusement, et le statut reste `BROUILLON`.

De plus, la ligne 979 force `statut: 'BROUILLON'` a chaque sync, meme si le chef a deja signe et transmis.

---

## Plan de correction (3 etapes)

### Etape 1 : Migration DB -- Changer la contrainte unique

Remplacer la contrainte `UNIQUE (macon_id, jour)` par `UNIQUE (macon_id, jour, chantier_id)` sur la table `affectations_jours_chef`.

Cela permet a un chef d'avoir une affectation sur son chantier principal ET une sur son chantier secondaire le meme jour.

```sql
ALTER TABLE affectations_jours_chef 
  DROP CONSTRAINT affectations_jours_chef_macon_id_jour_key;

ALTER TABLE affectations_jours_chef 
  ADD CONSTRAINT affectations_jours_chef_macon_jour_chantier_key 
  UNIQUE (macon_id, jour, chantier_id);
```

### Etape 2 : Edge Function -- Corriger `sync-planning-to-teams`

**2a.** Mettre a jour tous les `onConflict: 'macon_id,jour'` en `onConflict: 'macon_id,jour,chantier_id'` (5 occurrences dans le fichier).

**2b.** Modifier le garde-fou (lignes 1088-1107) pour ne supprimer que les affectations du chef sur des chantiers ou il n'est PAS planifie :

```text
Avant : supprimer tout ou chantier_id != principal
Apres : supprimer uniquement ou chantier_id n'est PAS dans le planning du chef cette semaine
```

Concretement, on verifie `planningByEmployeChantier` pour savoir sur quels chantiers le chef est legitimement planifie, et on ne supprime que les affectations orphelines.

**2c.** Proteger les statuts avances : Ne pas forcer `statut: 'BROUILLON'` si la fiche est deja en `VALIDE_CHEF`, `VALIDE_CONDUCTEUR` ou `ENVOYE_RH`. Seules les fiches en `BROUILLON` existant sont reinitialises. (Le statut `CLOTURE` est deja protege.)

### Etape 3 : Code client -- Mettre a jour les hooks

Dans `src/hooks/useAffectationsJoursChef.ts`, mettre a jour les 2 occurrences de `onConflict: "macon_id,jour"` en `onConflict: "macon_id,jour,chantier_id"` (lignes 113 et 335).

---

## Risques de regression et protections

- **Employes non-chef** : Pas affectes. Un macon standard n'est jamais sur 2 chantiers le meme jour (le planning l'empeche), donc la nouvelle contrainte ne change rien pour eux.
- **Chef mono-chantier** : Pas affecte. La 3e colonne dans la contrainte est toujours la meme, comportement identique.
- **Phase nettoyage (lignes 1126+)** : Deja correctement basee sur `planningByEmployeChantier`, pas de changement necessaire.
- **Garde-fou modifie** : Supprime toujours les affectations "polluees" (chantiers ou le chef n'est pas planifie), mais conserve les secondaires legitimes.

