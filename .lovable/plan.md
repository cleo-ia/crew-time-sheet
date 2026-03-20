

## Passer le champ "Chef d'équipe" en lecture seule

### Contexte

Le champ "Chef d'équipe" est modifiable dans deux endroits :
1. **`ChantiersManager.tsx`** — formulaire de création/édition depuis la liste `/chantiers` (lignes 402-417)
2. **`ChantierEditDialog.tsx`** — formulaire d'édition depuis la page détail d'un chantier (lignes 223-241)

L'association chef-chantier doit se faire uniquement via le planning, pas manuellement.

### Modifications

**Fichier 1 : `src/components/admin/ChantiersManager.tsx`** (lignes 402-417)
- Remplacer le `Select` par un champ texte en lecture seule qui affiche le nom du chef actuel (ou "Aucun")
- Ne pas envoyer `chef_id` dans le payload de sauvegarde (le laisser inchangé)
- S'applique uniquement quand `basePath` est `/chantiers` (côté conducteur) — le formulaire admin garde le contrôle

**Fichier 2 : `src/components/chantier/ChantierEditDialog.tsx`** (lignes 223-241)
- Remplacer le `Select` par un champ texte en lecture seule affichant le nom du chef ou "Aucun"
- Retirer `chef_id` du payload `handleSave` pour ne pas écraser la valeur existante

### Détails techniques

- On utilise la liste `chefs` déjà chargée pour résoudre le nom à partir de `formData.chef_id`
- Le champ affichera un `Input` avec `disabled` et la valeur textuelle du chef
- Ajout d'un texte d'aide : "Géré automatiquement via le planning"
- Zéro changement de logique métier, uniquement du rendu UI

