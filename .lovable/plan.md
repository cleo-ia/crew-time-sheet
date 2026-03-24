

## Rendre le conducteur obligatoire a la creation d'un chantier

### Probleme
Actuellement, on peut creer un chantier sans conducteur. Si ce chantier est ensuite utilise dans le planning, la sync cree des `fiches_jours` mais aucune ligne dans `affectations_finisseurs_jours` ni `affectations_jours_chef`, ce qui rend les ouvriers invisibles dans l'interface.

### Correction

**Fichier:** `src/components/admin/ChantiersManager.tsx`

1. **Validation dans `handleSave`** : avant de sauvegarder, verifier que `formData.conducteur_id` est renseigne. Si vide, afficher un toast d'erreur "Le conducteur de travaux est obligatoire" et bloquer la sauvegarde. Cette validation s'applique uniquement a la creation (pas a l'edition, car un chantier existant peut avoir un conducteur assigne par ailleurs).

2. **Label du champ** : changer "Conducteur de travaux" en "Conducteur de travaux *" (avec asterisque) pour signaler visuellement le champ obligatoire.

3. **Bouton "Creer" desactive** : en mode creation (pas edition), desactiver le bouton si `!formData.conducteur_id` pour empecher le clic.

Pas de changement cote base de donnees (la colonne `conducteur_id` reste nullable pour les chantiers historiques).

