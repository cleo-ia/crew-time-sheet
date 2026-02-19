
# Corriger le récap signatures finisseurs : groupement multi-chantier et stats par site

## Problemes identifies

1. **Chantier manquant** : Le groupement (ligne 529) prend uniquement `affectedDays[0].chantier_id`, donc BOUSHABI n'apparait que sous son premier chantier (VENISSIEUX ou VILOGIA) et AMBERIEU est absent.

2. **Stats incorrectes** : `calculateAffectedStats` (ligne 495) ne filtre pas par `chantierId`. Pour VILOGIA, elle additionne les 5 jours de toutes les fiches au lieu des 2 jours du site, d'ou 54h/7 paniers/5 trajets.

## Corrections

### Fichier : `src/pages/SignatureFinisseurs.tsx`

#### 1. Groupement multi-chantier (lignes 518-547)

Remplacer la logique qui prend `affectedDays[0]` par une boucle sur TOUS les chantiers uniques de chaque finisseur :

```text
finisseurs.forEach(finisseur => {
  // Tous les chantiers uniques de ce finisseur
  const chantierIdsUniques = [...new Set(
    (finisseur.affectedDays || []).map(a => a.chantier_id).filter(Boolean)
  )];
  
  for (const chantierId of chantierIdsUniques) {
    if (!map.has(chantierId)) {
      const info = chantiersInfo.get(chantierId);
      map.set(chantierId, {
        chantierId,
        code: info?.code || "SANS_CODE",
        nom: info?.nom || "",
        finisseurs: []
      });
    }
    map.get(chantierId)!.finisseurs.push(finisseur);
  }
});
```

Resultat : BOUSHABI apparaitra sous AMBERIEU ET sous VILOGIA.

#### 2. Stats filtrees par chantier (lignes 494-516 + appel ligne 679)

Ajouter un parametre `chantierId` a `calculateAffectedStats` pour ne compter que les jours du site concerne :

```text
const calculateAffectedStats = (finisseur: FinisseurWithFiche, chantierId?: string) => {
  // Filtrer affectedDays par chantierId si fourni
  const relevantAffectedDays = chantierId
    ? (finisseur.affectedDays || []).filter(a => a.chantier_id === chantierId)
    : (finisseur.affectedDays || []);
    
  const affectedDatesSet = new Set(relevantAffectedDays.map(a => a.date));
  const relevantJours = (finisseur.ficheJours || []).filter(jour => 
    affectedDatesSet.has(jour.date)
  );
  // ... calcul identique sur relevantJours
};
```

A l'appel (ligne 679), passer le chantierId du groupe :

```text
const stats = calculateAffectedStats(finisseur, chantierGroup.chantierId);
```

#### 3. Filtrage transport et absences par chantier (lignes 682-695)

Filtrer egalement les jours de transport et le calcul d'absences par les dates du chantier en cours (pas toutes les affectations) :

```text
// Dates d'affectation pour CE chantier uniquement
const chantierAffectedDays = (finisseur.affectedDays || [])
  .filter(a => a.chantier_id === chantierGroup.chantierId);
const affectedDatesSet = new Set(chantierAffectedDays.map(a => a.date));
```

## Resultat attendu

- **AMBERIEU** : BOUSHABI avec ~31h sur 3 jours (L/M/J)
- **VILOGIA** : BOUSHABI avec ~15h sur 2 jours (Me/V)
- **VENISSIEUX** : RAZOUK avec 39h sur 5 jours (inchange)
- Chaque bloc transport ne montre que les jours du site correspondant
