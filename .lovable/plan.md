

# Correction du comptage paniers/trajets sur les jours d'absence

## Le probleme

Dans la vue RH, quand un employe est absent (0h travaillees, 0h intemperies), ses paniers repas et trajets sont quand meme comptes dans les totaux. Par exemple, Bentouhami Mustafa a 2 jours "Contrat non debute" mais le systeme affiche 5 paniers et 5 trajets au lieu de 3.

## La cause

Dans le fichier `src/hooks/rhShared.ts`, le code qui calcule les totaux ne verifie pas si le jour est une absence avant de compter les paniers et les trajets. Il compte tout, y compris les jours ou l'employe n'a pas travaille.

## La solution

Ajouter une condition : **ne compter le panier et le trajet que si le jour n'est pas une absence** (c'est-a-dire si les heures ou les intemperies sont superieures a 0).

## Detail technique

**Fichier modifie** : `src/hooks/rhShared.ts`

Lignes ~507-517, remplacer :

```typescript
if (heuresDuJour === 0 && intemperie === 0) {
  absences++;
}

if (panier) paniers++;

// Compteur par code trajet
if ((jourRef as any).code_trajet) {
  trajetsParCode[...] = ...;
  totalJoursTrajets++;
}
```

Par :

```typescript
const isAbsentDay = heuresDuJour === 0 && intemperie === 0;

if (isAbsentDay) {
  absences++;
}

// Ne compter panier et trajet QUE si le jour n'est pas une absence
if (!isAbsentDay && panier) paniers++;

if (!isAbsentDay && (jourRef as any).code_trajet) {
  trajetsParCode[...] = ...;
  totalJoursTrajets++;
}
```

Cela corrigera les totaux dans le resume global, le recapitulatif par semaine, et le detail jour par jour. Il faudra publier pour que la correction s'applique en production.
