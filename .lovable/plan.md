

## Afficher tous les chantiers dans le détail des fiches en attente (multi-chantier)

### Probleme
Quand on clique sur un badge semaine (ex: S14 pour BOUILLET), le hook `useFicheBlockDetail` fait `.limit(1).maybeSingle()` et ne retourne qu'un seul chantier. Pour un chef multi-chantier, on ne voit qu'un des deux.

### Solution

**Fichier 1 : `src/hooks/useFicheBlockDetail.ts`**
- Changer le type de retour : `FicheBlockDetail | null` → `FicheBlockDetail[]`
- Au lieu de `.limit(1).maybeSingle()`, récupérer **toutes** les fiches du salarié pour cette semaine
- Grouper par `chantier_id` unique
- Pour chaque chantier, exécuter la même logique existante (fetch chantier info, affectations, équipe, diagnostic)
- Retourner un tableau de blocs

**Fichier 2 : `src/components/rh/FicheBlockDetailDialog.tsx`**
- Adapter au nouveau type tableau : `data` est maintenant un `FicheBlockDetail[]`
- Si un seul chantier → affichage identique à aujourd'hui (pas de changement visuel)
- Si plusieurs chantiers → afficher chaque chantier dans une section séparée avec :
  - Titre du chantier en sous-titre
  - Son diagnostic propre
  - Chef / Conducteur du chantier
  - Bouton rappel propre au chantier
  - Table équipe du chantier
- Utiliser un `Accordion` ou des sections séparées avec un `Separator` entre chaque chantier

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/hooks/useFicheBlockDetail.ts` | Fetch multi-fiches, retourner `FicheBlockDetail[]` |
| `src/components/rh/FicheBlockDetailDialog.tsx` | Render multi-chantier avec sections par chantier |

### Resultat attendu
Pour BOUILLET S14 : au clic on voit MAILLARD et DAVOULT, chacun avec son équipe, son diagnostic et son bouton rappel.

