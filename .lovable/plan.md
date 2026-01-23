
# Plan de correction : Bloquer la sélection conducteur pour "Trajet Perso"

## Contexte

Lorsqu'un employé a coché "Trajet Perso" dans le formulaire de saisie des heures, cela signifie qu'il utilise sa propre voiture pour se rendre au chantier. Il est donc illogique de le sélectionner comme conducteur d'un véhicule d'entreprise.

Actuellement, le système enregistre deux informations :
- `trajet_perso = false` (boolean)
- `code_trajet = "T_PERSO"` (string)

Le composant `ConducteurCombobox` ne vérifie que le boolean `trajet_perso`, ce qui permet de sélectionner des employés qui ont pourtant "T Perso" coché.

## Solution

Modifier le composant `ConducteurCombobox` pour vérifier les deux sources d'information :

### Fichier modifie : `src/components/transport/ConducteurCombobox.tsx`

**Modification 1** : Ajouter `code_trajet` a l'interface `MaconData.ficheJours`

```text
Ligne 14-18 : Ajouter code_trajet au type
ficheJours?: Array<{
  date: string;
  heures?: number;
  trajet_perso?: boolean;
  code_trajet?: string | null;  // NOUVEAU
}>;
```

**Modification 2** : Mettre a jour la logique de detection dans `getMaconStatus`

```text
Ligne 73 : Changer la verification
AVANT:
return { isTrajetPerso: jourData.trajet_perso || false, ... }

APRES:
return { 
  isTrajetPerso: jourData.trajet_perso || jourData.code_trajet === "T_PERSO", 
  ... 
}
```

## Comportement attendu

Apres cette modification :
- Si un employe a `trajet_perso = true` OU `code_trajet = "T_PERSO"` pour un jour donne
- Il apparait **desactive** dans la liste des conducteurs avec le badge "(Trajet perso)"
- La selection est **bloquee**
- Un avertissement visuel s'affiche s'il etait deja selectionne

## Flux de verification

```text
+-------------------------------------------------------------+
|                    FLUX DE VERIFICATION                     |
+-------------------------------------------------------------+
|                                                             |
|  Donnees fiches_jours                                       |
|  +-----------------------------------------------------+   |
|  | trajet_perso: boolean  |  code_trajet: string       |   |
|  | (ex: false)            |  (ex: "T_PERSO")           |   |
|  +-----------------------------------------------------+   |
|                         |                                   |
|                         v                                   |
|  +-----------------------------------------------------+   |
|  |      isTrajetPerso = trajet_perso === true          |   |
|  |                      OU                              |   |
|  |                  code_trajet === "T_PERSO"          |   |
|  +-----------------------------------------------------+   |
|                         |                                   |
|                         v                                   |
|  +-----------------------------------------------------+   |
|  | Si isTrajetPerso = true :                           |   |
|  |   -> Employe DESACTIVE dans la liste conducteurs    |   |
|  |   -> Badge "(Trajet perso)" affiche                 |   |
|  |   -> Selection bloquee                              |   |
|  +-----------------------------------------------------+   |
|                                                             |
+-------------------------------------------------------------+
```

## Impact

- Aucun nouveau champ en front-end
- Aucune modification de la base de donnees
- Modification mineure d'un seul fichier
- Compatible avec les donnees existantes
