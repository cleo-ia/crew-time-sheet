

# Corriger le trajet/trajet perso/GD pour les chefs multi-chantier dans la consolidation RH

## Rappel du contexte

Le chef ne renseigne pas le code zone (T1, T2...). Il coche simplement :
- **Trajet** → sauvegarde `T = 1` + `code_trajet = "A_COMPLETER"` en BDD
- **Trajet Perso** → sauvegarde `code_trajet = "T_PERSO"`
- **GD** → sauvegarde `code_trajet = "GD"`

C'est le RH qui, plus tard, remplace "A_COMPLETER" par le vrai code zone.

## Le probleme

Pour un chef multi-chantier, le systeme consolide les donnees de plusieurs fiches par jour. Actuellement :
- **Heures** : somme de toutes les fiches → OK
- **Panier** : "au moins un coche" parmi toutes les fiches → OK
- **Trajet / Trajet Perso / GD** : pris depuis une seule fiche choisie par "meilleur statut" → PROBLEME

Si le chef a travaille 8h sur le chantier B (avec trajet coche) et 0h sur le chantier A, le systeme peut prendre la fiche du chantier A (0h, pas de trajet) comme reference, et le trajet est perdu.

## La solution

Appliquer la meme logique que le panier : chercher le trajet parmi toutes les fiches du jour, en prenant celle qui a des heures > 0.

## Fichier a modifier

**`src/hooks/rhShared.ts`** - bloc chef multi-chantier (lignes 485-548)

### Changements concrets

**1. Apres la ligne 496** (`jourRef = bestEntry.jour;`), ajouter :

```typescript
// Pour le trajet : prendre les infos depuis la fiche qui a des heures > 0
const entryAvecHeures = entries.find(e => 
  (Number(e.jour.heures) || Number(e.jour.HNORM) || 0) > 0
);
const jourRefTrajet = entryAvecHeures ? entryAvecHeures.jour : jourRef;
```

**2. Lignes 524-527** : remplacer `jourRef` par `jourRefTrajet` pour le compteur trajet :

```typescript
if (!isAbsent && (jourRefTrajet as any).code_trajet) {
  trajetsParCode[(jourRefTrajet as any).code_trajet] = 
    (trajetsParCode[(jourRefTrajet as any).code_trajet] || 0) + 1;
  totalJoursTrajets++;
}
```

**3. Lignes 542-543** : remplacer `jourRef` par `jourRefTrajet` pour le detail :

```typescript
trajet: (jourRefTrajet as any).code_trajet || null,
trajetPerso: (jourRefTrajet as any).code_trajet === "T_PERSO",
```

**4. Pour les non-chefs**, rien ne change : `jourRefTrajet` n'est pas defini, on continue a utiliser `jourRef` comme avant. On initialise `jourRefTrajet = jourRef` par defaut avant le `if`.

### Ce que ca couvre

| Situation | Avant | Apres |
|-----------|-------|-------|
| Chef coche "Trajet" sur chantier B (8h), rien sur A (0h) | Peut prendre A → trajet perdu | Prend B → trajet OK |
| Chef coche "Trajet Perso" sur chantier B (8h) | Peut prendre A → trajet perso perdu | Prend B → "T_PERSO" OK |
| Chef coche "GD" sur chantier B (8h) | Peut prendre A → GD perdu | Prend B → "GD" OK |
| Chef mono-chantier | Pas de changement | Pas de changement |
| Employe normal | Pas de changement | Pas de changement |

## Resume simple

On applique la regle : "pour savoir quel trajet le chef a fait ce jour-la, on regarde la fiche ou il a travaille (heures > 0), pas la fiche avec le meilleur statut." C'est exactement la meme logique que pour le panier.

