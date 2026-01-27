

# Ajout du bouton "Dupliquer le Lundi" sur la fiche de trajet

## Fonctionnalité demandée

Permettre aux chefs de copier les informations de transport du Lundi (véhicules + conducteurs matin/soir) vers les autres jours de la semaine (Mardi → Vendredi) en un clic.

---

## Comportement attendu

1. Le chef remplit les informations du Lundi (ex: 2 véhicules avec leurs conducteurs)
2. Il clique sur le bouton "Dupliquer" visible sur le header du Lundi
3. Les informations sont automatiquement copiées sur Mardi, Mercredi, Jeudi et Vendredi
4. L'auto-save se déclenche pour sauvegarder les modifications

---

## Modifications techniques

### Fichier 1 : `src/components/transport/TransportDayAccordion.tsx`

**Ajout d'une nouvelle prop et du bouton :**

| Élément | Description |
|---------|-------------|
| Nouvelle prop `isMonday` | Booléen pour identifier le Lundi |
| Nouvelle prop `onDuplicateToWeek` | Callback pour déclencher la duplication |
| Bouton "Dupliquer" | Affiché uniquement sur le header du Lundi |

**Position du bouton :** Dans le header de l'accordéon (AccordionTrigger), à côté du compteur de véhicules.

**Apparence :** 
- Icône `Copy` de lucide-react
- Texte compact : "Appliquer à la semaine"
- Style : `variant="ghost"` avec couleur primaire
- Visible uniquement si le Lundi contient au moins 1 véhicule complet

---

### Fichier 2 : `src/components/transport/TransportSheetV2.tsx`

**Ajout de la fonction de duplication :**

```text
Fonction: duplicateMondayToWeek()
1. Récupère les données du Lundi (transportDays[0])
2. Pour chaque jour (Mardi → Vendredi) :
   - Copie la structure des véhicules du Lundi
   - Génère de nouveaux IDs pour chaque véhicule
   - Conserve les immatriculations et conducteurs
3. Met à jour le state transportDays
4. Marque isDirty pour déclencher l'auto-save
```

**Passage des props au TransportDayAccordion :**
- `isMonday={index === 0}`
- `onDuplicateToWeek={duplicateMondayToWeek}`

---

## Interface utilisateur

```text
┌────────────────────────────────────────────────────────────┐
│  Lundi 27/01                    [📋 Appliquer à la semaine] │  ← Bouton visible
│                                  1/1 véhicule(s) complet(s) │
└────────────────────────────────────────────────────────────┘
│  Mardi 28/01                                                │  ← Pas de bouton
│                                  0/0 véhicule(s) complet(s) │
└────────────────────────────────────────────────────────────┘
```

---

## Règles métier

| Règle | Description |
|-------|-------------|
| Bouton visible si | C'est le Lundi ET au moins 1 véhicule est ajouté |
| Bouton désactivé si | Mode lecture seule (`isReadOnly`) |
| Après duplication | Toast de confirmation "Données du Lundi appliquées à la semaine" |
| Écrasement | Les données existantes des autres jours sont remplacées |

---

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/transport/TransportDayAccordion.tsx` | Ajout props `isMonday` et `onDuplicateToWeek`, affichage du bouton |
| `src/components/transport/TransportSheetV2.tsx` | Ajout fonction `duplicateMondayToWeek`, passage des props |

---

## Résultat attendu

- Le chef remplit le Lundi une seule fois
- Un clic sur "Appliquer à la semaine" copie tout sur Mardi→Vendredi
- Gain de temps significatif pour les équipes avec la même configuration toute la semaine

