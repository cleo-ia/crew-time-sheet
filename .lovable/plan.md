

## Retirer le placeholder "à vérifier"

### Objectif

Ne rien afficher quand il n'y a pas de note, au lieu d'afficher "à vérifier" par défaut. Le champ reste cliquable pour ajouter une note si besoin.

### Fichier modifié

`src/components/admin/InventoryTemplatesManager.tsx`

### Changement

**Ligne 380-386** : Afficher la note seulement si elle existe, sinon afficher un petit lien discret "Ajouter une note" (ou juste une zone cliquable vide avec une icône crayon au hover) :

```text
Avant :  {t.notes || "à vérifier"}

Après :  {t.notes || ""}
```

Le `div` reste cliquable pour permettre l'ajout d'une note, mais n'affiche plus de texte par défaut. On garde le style `cursor-pointer hover:text-primary` pour que l'utilisateur puisse cliquer dessus si besoin.

### Risque

Aucun — changement cosmétique d'une seule ligne.

