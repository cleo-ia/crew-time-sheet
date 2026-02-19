

# Ajuster la logique trajet : chercher le code_trajet parmi toutes les fiches (comme le panier)

## Pourquoi

Avec la logique actuelle (`entries.find(e => heures > 0)`), si le chef fait 4h sur A (pas de trajet) et 4h sur B (trajet coche), le systeme peut prendre A comme reference trajet car c'est la premiere avec des heures. Le trajet de B est perdu.

La bonne logique est la meme que pour le panier : chercher parmi toutes les fiches du jour celle qui a un `code_trajet` renseigne, peu importe les heures.

## Fichier a modifier

**`src/hooks/rhShared.ts`** - lignes 499-503

## Changement

Remplacer :

```typescript
// Pour le trajet : prendre les infos depuis la fiche qui a des heures > 0
const entryAvecHeures = entries.find(e => 
  (Number(e.jour.heures) || Number(e.jour.HNORM) || 0) > 0
);
jourRefTrajet = entryAvecHeures ? entryAvecHeures.jour : jourRef;
```

Par :

```typescript
// Pour le trajet : chercher la fiche qui a un code_trajet renseigne (meme logique que le panier)
const entryAvecTrajet = entries.find(e => (e.jour as any).code_trajet);
jourRefTrajet = entryAvecTrajet ? entryAvecTrajet.jour : jourRef;
```

Et mettre a jour le commentaire ligne 484 :

```typescript
let jourRefTrajet: typeof joursData[0]; // Reference pour le trajet (fiche avec code_trajet renseigne)
```

## Resultat

| Cas | Avant | Apres |
|-----|-------|-------|
| 4h sur A (pas trajet) + 4h sur B (trajet) | Peut prendre A → trajet perdu | Prend B → trajet OK |
| 8h sur A (trajet) + 0h sur B (rien) | Prend A → OK | Prend A → OK |
| 0h sur A (rien) + 8h sur B (GD) | Prend B → OK | Prend B → OK |
| 4h sur A (trajet) + 4h sur B (trajet) | Prend A → OK | Prend A → OK |

C'est exactement la meme approche que `panier = entries.some(e => e.jour.PA === true)` : on cherche l'info la ou elle existe, sans presumer de la fiche.

