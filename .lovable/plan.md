

# Afficher un recap trajet par chantier dans la page signatures

## Probleme

Actuellement, le recap trajet ("Recapitulatif Trajet") n'apparait que sous un seul chantier au lieu d'un par site. La cause est dans la construction de `transportParChantier` (ligne 557-620) : chaque jour de transport enrichi contient un `codeChantier` mais pas le `chantier_id` direct. Le groupement essaie de retrouver le `chantierId` en faisant un reverse-lookup par code chantier (ligne 565), ce qui echoue quand le `codeChantier` ne correspond pas exactement ou quand `codeChantierByDate` (keyed par date seule) ecrase les donnees multi-chantier sur la meme date.

## Correction

### Fichier : `src/pages/SignatureFinisseurs.tsx`

#### 1. Stocker le `chantier_id` dans les donnees enrichies (ligne 210-221)

Ajouter le champ `chantierId` directement dans chaque jour enrichi, recupere depuis `fichesTransportMeta` :

```text
return {
  ...jour,
  codeChantier: codeFromFiche || codeDefault || "-",
  chantierId: ft?.chantier_id || ""   // <-- AJOUT
};
```

#### 2. Simplifier le groupement `transportParChantier` (ligne 562-567)

Remplacer le reverse-lookup par code par l'utilisation directe du `chantierId` stocke :

```text
// AVANT (fragile)
const chantierId = Array.from(chantiersInfo.entries())
  .find(([_, info]) => info.code === jour.codeChantier)?.[0] || "";

// APRES (fiable)
const chantierId = jour.chantierId || "";
```

#### 3. Filtrer les jours par chantier dans le recap transport (ligne 645)

Actuellement `transportDays` contient tous les jours du chantier (5 jours). Il faut filtrer pour ne garder que les jours d'affectation reels du chantier. Le filtrage existe deja pour les stats heures (ligne 689-695) mais pas pour le transport affiché dans l'accordion.

Ajouter un filtrage des `transportDays` par les dates d'affectation du chantier :

```text
// Dates d'affectation uniques pour ce chantier
const chantierAffectedDates = new Set(
  chantierGroup.finisseurs.flatMap(f =>
    (f.affectedDays || [])
      .filter(a => a.chantier_id === chantierGroup.chantierId)
      .map(a => a.date)
  )
);

// Filtrer les jours de transport pour ne montrer que les dates d'affectation
const filteredTransportDays = transportDays.filter(day => 
  chantierAffectedDates.has(day.date)
);
```

Puis passer `filteredTransportDays` au composant `TransportSummaryV2` au lieu de `transportDays`.

## Resultat attendu

- **VENISSIEUX** : recap trajet avec 5 jours (L-V) - RAZOUK y est affecte toute la semaine
- **AMBERIEU** : recap trajet avec 3 jours (L/M/J) - jours BOUSHABI sur ce site
- **VILOGIA** : recap trajet avec 2 jours (Me/V) - jours BOUSHABI sur ce site
- Chaque recap montre exactement les vehicules/conducteurs saisis a l'etape precedente pour ce chantier specifique
