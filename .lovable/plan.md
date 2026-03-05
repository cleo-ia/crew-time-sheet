

## Correction : afficher les fiches fantômes (absences longue durée / congés) dans l'onglet Détail RH

### Problème confirmé

La requête `useRHDetails` (ligne 180 de `useRHData.ts`) utilise `chantiers!inner(...)` -- un **INNER JOIN**. Les fiches fantômes ont `chantier_id = null`, donc elles sont **systématiquement exclues** de cette vue.

De plus, le filtre entreprise (ligne 192) passe par `chantier.entreprise_id`, ce qui ne fonctionne pas non plus pour les fiches sans chantier.

### Impact de la correction

**Uniquement l'onglet "Détail" de la page RH.** Aucun autre endroit n'est touché :
- La vue consolidée (`rhShared.ts`) gère deja les ghost fiches -- pas de changement
- L'export Excel utilise `rhShared.ts` -- pas de changement
- La vue employé détail (`useRHEmployeeDetail`) -- pas concernée ici
- La validation conducteur -- pas concernée
- Le planning -- pas concerné

### Plan de correction

**Fichier : `src/hooks/useRHData.ts`** (fonction `useRHDetails`, lignes 173-277)

1. **Changer le join** : remplacer `chantiers!inner(...)` par `chantier:chantiers(...)` (left join) pour inclure les fiches sans chantier
2. **Ajouter `entreprise_id`** dans le select de la fiche elle-même (il existe sur la table `fiches`) pour pouvoir filtrer les ghost fiches par entreprise
3. **Adapter le filtre entreprise** : filtrer sur `fiches.entreprise_id` directement au lieu de `chantier.entreprise_id`
4. **Adapter le groupement** (lignes 246-264) : quand `chantier` est null, utiliser un libellé type "Absence longue durée" ou le type d'absence, et grouper par `salarie_id + semaine`
5. **Récupérer le type d'absence** depuis `fiches_jours` pour afficher le bon libellé (CP, Maladie, AT, etc.)

**Fichier : `src/components/rh/RHDetailView.tsx`**

6. **Adapter l'affichage** : quand `fiche.chantier` est un libellé d'absence (pas un vrai chantier), afficher un badge/style différent pour distinguer visuellement les absences des fiches chantier normales

### Ce qui ne change PAS

- Les fiches normales (avec chantier) continuent de fonctionner exactement pareil
- Le filtre par conducteur/chantier/salarié reste fonctionnel (les ghost fiches n'ont pas de conducteur, donc elles seront naturellement exclues si on filtre par conducteur ou par chantier spécifique)
- L'export Excel, la vue consolidée, la validation : zéro impact

