
# Historique des demandes de transport matériaux

## Objectif

Ajouter une vue "historique" dans le module Transport Matériaux permettant au conducteur de :
- Voir toutes ses demandes passées (brouillons et transmises)
- Consulter les détails d'une demande existante
- Reprendre l'édition d'un brouillon
- Supprimer un brouillon si nécessaire

---

## Interface proposée

### Option 1 : Onglets dans le Sheet (recommandée)

Transformer le `TransportMateriauxSheet` actuel en 2 onglets :

```
┌─────────────────────────────────────────────────────────────────┐
│  📦 Transport matériaux                                         │
├─────────────────────────────────────────────────────────────────┤
│  [Nouvelle demande]     [Historique (3)]                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   (Contenu de l'onglet actif)                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

- **Onglet "Nouvelle demande"** : Formulaire actuel (création)
- **Onglet "Historique"** : Liste des demandes existantes avec badge du nombre

### Contenu de l'onglet Historique

Liste des fiches avec pour chaque carte :
- Nom du chantier + code
- Date de livraison prévue (semaine + jour)
- Statut : Badge "Brouillon" (orange) ou "Transmise" (vert)
- Date de transmission (si transmise)
- Nombre de lignes matériaux
- Actions : Voir/Modifier (brouillon) | Voir (transmise) | Supprimer (brouillon)

---

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/conducteur/TransportMateriauxSheet.tsx` | Ajouter système d'onglets + vue historique |

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/conducteur/TransportMateriauxHistorique.tsx` | Composant liste historique |
| `src/components/conducteur/TransportMateriauxFicheCard.tsx` | Carte pour chaque fiche dans l'historique |

---

## Structure des composants

### TransportMateriauxSheet (modifié)

```
- Header avec titre
- Tabs
  - Tab "Nouvelle demande" → Formulaire actuel
  - Tab "Historique" → TransportMateriauxHistorique
```

### TransportMateriauxHistorique

```
- Liste scrollable des fiches
- Chaque fiche = TransportMateriauxFicheCard
- Tri par date (plus récent en premier)
- Séparation visuelle Brouillons / Transmises
```

### TransportMateriauxFicheCard

```
┌──────────────────────────────────────────────────────────┐
│ [Badge: Transmise ✓]                     [Supprimer 🗑]  │
│                                                          │
│ 📍 CHANTIER 001 - Construction École                    │
│ 📅 Livraison : Mardi 28/01/2026 (S05)                  │
│ 🚚 Camion grue                                          │
│ 📦 3 matériaux                                          │
│                                                          │
│ Transmise le 27/01/2026 à 14h30                         │
│                                                          │
│                              [Voir les détails →]        │
└──────────────────────────────────────────────────────────┘
```

---

## Workflow utilisateur

```
1. Conducteur clique sur "Transport matériaux"
2. Sheet s'ouvre avec 2 onglets
3. Par défaut : onglet "Nouvelle demande" (formulaire vierge)
4. Clic sur "Historique" → voit la liste de ses demandes
5. Clic sur une carte :
   - Si brouillon → ouvre le formulaire en mode édition
   - Si transmise → ouvre le formulaire en mode lecture seule
6. Possibilité de supprimer les brouillons via icône poubelle
```

---

## Avantages de cette approche

- **Pas de navigation supplémentaire** : tout est dans le même drawer
- **Accès rapide** : un clic sur le bouton existant
- **Vue unifiée** : création + historique au même endroit
- **Badge compteur** sur l'onglet pour savoir s'il y a des demandes
- **Réutilisation** du formulaire existant pour l'édition/consultation

---

## Données affichées par fiche

| Donnée | Source |
|--------|--------|
| Chantier (nom + code) | `chantier.nom`, `chantier.code_chantier` |
| Ville | `chantier.ville` |
| Date livraison | `jour_livraison` formaté |
| Semaine | `semaine_livraison` |
| Moyen transport | `moyen_transport` |
| Statut | `statut` (BROUILLON/TRANSMISE) |
| Date transmission | `transmise_at` formaté |
| Nb matériaux | `lignes.length` |

---

## Estimation

| Tâche | Complexité |
|-------|------------|
| Composant TransportMateriauxFicheCard | Simple |
| Composant TransportMateriauxHistorique | Simple |
| Modification TransportMateriauxSheet (onglets) | Moyenne |
| Gestion mode édition/lecture | Déjà implémenté |
| Suppression brouillon | Simple (hook existe) |
