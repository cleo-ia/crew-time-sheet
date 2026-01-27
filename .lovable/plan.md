
# Protection anti double-clic sur la creation d'utilisateurs

## Contexte

Suite au nettoyage des 10 doublons, il faut ajouter une protection anti double-clic pour empecher que le meme probleme ne se reproduise. La verification cote SDER confirme : **0 doublon detecte** - les donnees sont propres.

## Analyse du probleme

Les 7 interfaces de creation d'utilisateurs utilisent toutes `useCreateUtilisateur.mutateAsync()` mais aucune ne desactive le bouton pendant le traitement :

| Composant | Bouton concerne |
|-----------|-----------------|
| MaconsManager.tsx | "Creer" (ligne 410) |
| GrutiersManager.tsx | "Creer" (ligne 409) |
| FinisseursManager.tsx | "Creer" (ligne 436) |
| ChefsManager.tsx | "Creer" |
| ConducteursManager.tsx | "Creer" |
| InterimairesManager.tsx | via InterimaireFormDialog |
| InterimaireFormDialog.tsx | "Creer" (ligne 99) |

## Solution proposee

Utiliser la propriete `isPending` (ou `isLoading`) de la mutation React Query pour desactiver le bouton pendant le traitement.

### Modifications techniques

Pour chaque composant :

1. **Recuperer l'etat de chargement** depuis `createUtilisateur.isPending`
2. **Desactiver le bouton** avec `disabled={createUtilisateur.isPending}`
3. **Afficher un indicateur visuel** (texte "Creation..." ou spinner)

### Exemple de modification

```text
Avant:
  <Button onClick={handleSave}>
    {editingMacon ? "Modifier" : "Creer"}
  </Button>

Apres:
  <Button 
    onClick={handleSave} 
    disabled={createUtilisateur.isPending}
  >
    {createUtilisateur.isPending ? "Creation..." : (editingMacon ? "Modifier" : "Creer")}
  </Button>
```

### Fichiers a modifier

1. `src/components/admin/MaconsManager.tsx`
   - Ligne 410 : ajouter `disabled` et texte conditionnel

2. `src/components/admin/GrutiersManager.tsx`
   - Ligne 409 : idem

3. `src/components/admin/FinisseursManager.tsx`
   - Ligne 436 : idem

4. `src/components/admin/ChefsManager.tsx`
   - Bouton "Creer" dans DialogFooter

5. `src/components/admin/ConducteursManager.tsx`
   - Bouton "Creer" dans DialogFooter

6. `src/components/shared/InterimaireFormDialog.tsx`
   - Ligne 99 : recuperer `createUtilisateur.isPending` et desactiver

## Protections en place (recap)

| Niveau | Protection | Statut |
|--------|------------|--------|
| Frontend | Verification doublons avant insert | OK |
| Frontend | Protection double-clic (bouton disabled) | A implementer |
| Base de donnees | Index unique sur (nom, prenom, entreprise_id) | OK |

## Resultat attendu

- Un clic sur "Creer" desactive immediatement le bouton
- Le texte change en "Creation..." pendant le traitement
- Impossible de soumettre 2 fois le meme formulaire
- Message d'erreur clair si doublon detecte par le backend
