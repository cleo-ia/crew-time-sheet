
# Plan : Corriger le récapitulatif trajet côté Conducteur

## Résumé du problème

Deux problèmes identifiés :
1. **Section "Détail des trajets"** par employé toujours présente alors que le récap global existe maintenant
2. **Données incomplètes** dans le récap global : véhicules manquants et noms de conducteurs non affichés

## Cause racine

La source de données côté Conducteur est différente de celle côté Chef :
- **Chef** : utilise `useTransportByChantier` qui charge TOUS les jours transport du chantier avec les noms de conducteurs via JOIN SQL
- **Conducteur** : utilise `transportFinisseursData` qui filtre par finisseur et ne récupère pas les noms complets

De plus, le code de consolidation ne mappe pas les IDs conducteur aux noms.

---

## Modifications prévues

### Fichier : `src/pages/SignatureFinisseurs.tsx`

### Étape 1 : Supprimer la section "Détail des trajets" (lignes 616-691)

Supprimer le bloc de code conditionnel `{isExpanded && (...)}` qui affiche le détail dépliable par finisseur. Cette section est désormais redondante avec le récap global.

On garde toujours la ligne cliquable/expandable (avec le chevron) si on veut afficher autre chose à l'avenir, ou on peut aussi retirer l'interactivité de toggle.

### Étape 2 : Charger les données transport depuis la bonne source

Actuellement le code charge les données transport via un useEffect personnalisé (lignes 122-215) qui ne récupère qu'un seul jour par date.

Le problème : la table `fiches_transport_jours` stocke les données avec une logique **1 ligne par véhicule par période (MATIN/SOIR)**, comme vu dans la base de données.

Modification nécessaire :
- Récupérer TOUTES les lignes de `fiches_transport_jours` pour les chantiers concernés
- Grouper par date + immatriculation 
- Fusionner les lignes MATIN et SOIR pour obtenir les noms des deux conducteurs

### Étape 3 : Corriger la consolidation des données

Remplacer la fonction `consolidatedTransportData` (lignes 458-506) pour :

1. Utiliser directement les données chargées depuis `fiches_transport_jours`
2. Grouper par date puis par immatriculation
3. Fusionner les lignes MATIN et SOIR
4. Inclure les noms de conducteurs (déjà fournis par les JOINs SQL)

---

## Détail technique de la correction

### Structure des données dans la BDD

La table `fiches_transport_jours` a ce format :

```text
┌──────────────┬──────────────────┬─────────┬─────────────────────┬─────────────────────┐
│ date         │ immatriculation  │ periode │ conducteur_aller_id │ conducteur_retour_id│
├──────────────┼──────────────────┼─────────┼─────────────────────┼─────────────────────┤
│ 2026-02-02   │ ET-029-BX        │ MATIN   │ GRIBI               │ NULL                │
│ 2026-02-02   │ ET-029-BX        │ SOIR    │ NULL                │ GRIBI               │
│ 2026-02-02   │ FR-263-PN        │ MATIN   │ FERNANDES           │ NULL                │
│ 2026-02-02   │ FR-263-PN        │ SOIR    │ NULL                │ CENTRALISTE         │
└──────────────┴──────────────────┴─────────┴─────────────────────┴─────────────────────┘
```

### Format attendu pour `TransportSummaryV2`

```typescript
{
  days: [
    {
      date: "2026-02-02",
      vehicules: [
        { 
          immatriculation: "ET-029-BX",
          conducteurMatinNom: "Hadj Mohamed GRIBI",
          conducteurSoirNom: "Hadj Mohamed GRIBI"
        },
        { 
          immatriculation: "FR-263-PN",
          conducteurMatinNom: "Flavio FERNANDES",
          conducteurSoirNom: "CENTRALISTE CENTRALISTE"
        }
      ]
    }
  ]
}
```

### Algorithme de consolidation corrigé

```typescript
// 1. Charger TOUTES les lignes transport avec les JOINs conducteur
// (déjà fait dans le useEffect, mais en gardant toutes les lignes)

// 2. Grouper par date → immatriculation
const groupedByDate = new Map<string, Map<string, VehiculeData>>();

joursTransport.forEach(jour => {
  const date = jour.date;
  const immat = jour.immatriculation;
  
  if (!groupedByDate.has(date)) {
    groupedByDate.set(date, new Map());
  }
  
  const vehiculesMap = groupedByDate.get(date)!;
  
  if (!vehiculesMap.has(immat)) {
    vehiculesMap.set(immat, {
      immatriculation: immat,
      conducteurMatinNom: null,
      conducteurSoirNom: null
    });
  }
  
  const vehicule = vehiculesMap.get(immat)!;
  
  // Fusionner selon la période
  if (jour.periode === "MATIN" && jour.conducteur_aller) {
    vehicule.conducteurMatinNom = 
      `${jour.conducteur_aller.prenom} ${jour.conducteur_aller.nom}`;
  } else if (jour.periode === "SOIR" && jour.conducteur_retour) {
    vehicule.conducteurSoirNom = 
      `${jour.conducteur_retour.prenom} ${jour.conducteur_retour.nom}`;
  }
});
```

---

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/pages/SignatureFinisseurs.tsx` | Supprimer section "Détail des trajets" + corriger consolidation transport |

---

## Résultat attendu

Après correction :

| Date | Code Chantier | Véhicule | Conducteur Matin | Conducteur Soir |
|------|--------------|----------|------------------|-----------------|
| Lun. 02/02 | - | ET-029-BX | Hadj Mohamed GRIBI | Hadj Mohamed GRIBI |
| Lun. 02/02 | - | FR-263-PN | Flavio FERNANDES | CENTRALISTE |
| Mar. 03/02 | - | DL-898-FB | ... | ... |
| ... | ... | ... | ... | ... |

L'affichage sera identique à la vue Chef avec tous les véhicules et conducteurs visibles.
