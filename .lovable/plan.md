

## Protection double-clic — FicheDetail (validation conducteur)

**SignatureMacons** et **VehiculesManager** sont déjà protégés. Seul **FicheDetail** reste à corriger.

### Problème

Quand le conducteur signe, le `onSave` du `SignaturePad` lance la signature + validation en async. Pendant ce temps, rien n'empêche un double-clic ou une seconde interaction.

### Modification

**Fichier** : `src/components/validation/FicheDetail.tsx`

1. Ajouter `updateStatus.isPending || saveSignatureMutation.isPending` comme condition de désactivation sur le bouton "Signer" (le bouton qui affiche le `SignaturePad`).
2. Dans le `onSave` du `SignaturePad`, ajouter une garde `if (saveSignatureMutation.isPending || updateStatus.isPending) return;` en début de callback pour ignorer les appels concurrents.

### Impact
- 1 seul fichier modifié
- Aucun changement de logique métier
- Risque de régression : nul

