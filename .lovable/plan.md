
## Correction demandée (comprise)

Tu veux que les 2 boutons **ne soient plus sticky/fixed** et qu’ils soient **collés à la fin du formulaire** (juste après la dernière section), sans superposition sur le contenu.

## Plan de modification

1. **`src/components/chantier/tabs/ChantierInventaireTab.tsx`**
   - Remplacer la classe du conteneur boutons :
   - **Avant** : `flex gap-3 sticky bottom-4`
   - **Après** : `flex gap-3` (éventuellement `mt-2` si besoin d’un léger espace)
2. **Conserver** les styles actuels des 2 boutons (taille, couleurs, disabled, actions) sans autre changement.
3. **Vérification UI**
   - Dans la sheet inventaire, en scroll milieu de formulaire : les boutons ne doivent plus rester collés à l’écran.
   - En bas du formulaire : les boutons doivent apparaître immédiatement après le dernier bloc, sans chevaucher le contenu.

## Détails techniques

- Le problème vient uniquement de `sticky bottom-4` qui ancre visuellement le bandeau pendant le scroll.
- Le comportement attendu est un flux normal du DOM (position statique), donc suppression de `sticky`.
- Aucun impact logique (save/transmit) : uniquement un ajustement de positionnement CSS.

