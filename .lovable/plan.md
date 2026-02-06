
# Ajouter l'option "38h" dans le selecteur Base horaire

## Probleme

La mise a jour en base a bien ete effectuee (`base_horaire = '38h'` pour les 43 employes SDER), mais le selecteur dans l'interface ne propose que deux options : "35h" et "39h". La valeur "38h" n'etant pas dans la liste, le champ apparait vide.

## Solution

Ajouter l'option **"38h"** dans le composant `Select` de la base horaire, dans les 4 fichiers de gestion :

1. `src/components/admin/MaconsManager.tsx` (ligne 352-353)
2. `src/components/admin/ChefsManager.tsx`
3. `src/components/admin/GrutiersManager.tsx`
4. `src/components/admin/FinisseursManager.tsx`

## Modification

Dans chaque fichier, le select passe de :

```text
<SelectItem value="35h">35h</SelectItem>
<SelectItem value="39h">39h</SelectItem>
```

a :

```text
<SelectItem value="35h">35h</SelectItem>
<SelectItem value="38h">38h</SelectItem>
<SelectItem value="39h">39h</SelectItem>
```

## Impact

- Aucune modification de base de donnees
- Aucun impact sur le calcul des heures supplementaires (deja gere correctement)
- Les 43 employes SDER afficheront correctement "38h" dans le formulaire
- Les autres entreprises peuvent continuer a utiliser 35h ou 39h
