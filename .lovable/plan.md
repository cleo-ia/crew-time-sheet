

# Correction du cycle de contamination des codes trajet

## Flux garanti apres correction

1. **Sync lundi 5h** : chantier secondaire → `T: 0, code_trajet: null, PA: false` (deja correct, on n'y touche pas)
2. **Chef ouvre sa page** : le front lit `null` et garde `null` (plus de conversion en "A_COMPLETER")
3. **Auto-save** : ecrit `code_trajet: null, T: 0` — respecte la saisie, pas de transformation
4. **Chef coche la case trajet** : le front met `codeTrajet: "A_COMPLETER"`, l'auto-save ecrit `T: 1, code_trajet: "A_COMPLETER"` — normal, le chef a explicitement coche
5. **Fiche arrive en ENVOYE_RH** : le systeme `codes_trajet_defaut` remplace `"A_COMPLETER"` par le bon code (T2, T5, etc.) — deja en place, on n'y touche pas
6. **RH voit** : uniquement les vrais trajets coches par le chef

On ne touche PAS a GD et T_PERSO qui fonctionnent deja correctement.

## 3 fichiers a modifier + 1 script SQL

### 1. `src/components/timesheet/TimeEntryTable.tsx` — Ligne 772

Ne convertir `null` en `"A_COMPLETER"` QUE si la case trajet est cochee (`T > 0`).

```typescript
// AVANT
codeTrajet: ((j as any).code_trajet || "A_COMPLETER") as CodeTrajet,

// APRES
codeTrajet: (T > 0 ? ((j as any).code_trajet || "A_COMPLETER") : ((j as any).code_trajet || null)) as CodeTrajet,
```

### 2. `src/hooks/useAutoSaveFiche.ts` — Lignes 402-404

Ne jamais ecrire `"A_COMPLETER"` en BDD. Le `T` doit refleter uniquement les vrais codes trajet ou les cas speciaux (GD, T_PERSO).

```typescript
// AVANT
trajet_perso: dayData?.trajetPerso || dayData?.codeTrajet === "T_PERSO",
T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0 : (dayData?.codeTrajet ? 1 : 0),
code_trajet: dayData?.codeTrajet ?? null,

// APRES
trajet_perso: dayData?.trajetPerso || dayData?.codeTrajet === "T_PERSO",
T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0 
   : (dayData?.codeTrajet && dayData.codeTrajet !== 'A_COMPLETER') ? 1 
   : 0,
code_trajet: (dayData?.codeTrajet && dayData.codeTrajet !== 'A_COMPLETER') 
   ? dayData.codeTrajet 
   : null,
```

Concretement : si le chef n'a PAS coche la case trajet, `codeTrajet` sera `null` et on ecrit `T: 0, code_trajet: null`. Si le chef A coche la case trajet mais n'a pas encore de vrai code, `codeTrajet` vaut `"A_COMPLETER"` dans le front — on ecrit quand meme `T: 1, code_trajet: null` en BDD. Le `T: 1` preserve l'info "case cochee" et le systeme `codes_trajet_defaut` remplira le code au moment du passage en ENVOYE_RH.

**CORRECTION** : en fait si on ecrit `T: 1` mais `code_trajet: null`, le systeme `applyDefaultCodesTrajet` cherche les rows avec `code_trajet = 'A_COMPLETER'`. Il faut donc garder `"A_COMPLETER"` en BDD quand la case est cochee.

Reprise :

```typescript
// APRES (version corrigee)
trajet_perso: dayData?.trajetPerso || dayData?.codeTrajet === "T_PERSO",
T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0 
   : (dayData?.codeTrajet && dayData.codeTrajet !== 'A_COMPLETER') ? 1 
   : (dayData?.codeTrajet === 'A_COMPLETER') ? 1
   : 0,
code_trajet: (dayData?.codeTrajet === 'A_COMPLETER') ? 'A_COMPLETER'
   : (dayData?.codeTrajet && dayData.codeTrajet !== 'A_COMPLETER') ? dayData.codeTrajet 
   : null,
```

Simplifie :

```typescript
trajet_perso: dayData?.trajetPerso || dayData?.codeTrajet === "T_PERSO",
T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0
   : dayData?.codeTrajet ? 1
   : 0,
code_trajet: dayData?.codeTrajet ?? null,
```

C'est identique a l'actuel ! Le probleme n'est donc PAS dans l'auto-save. Le probleme est uniquement dans la LECTURE (point 1) : la ligne 772 transforme `null` en `"A_COMPLETER"`, et quand l'auto-save re-ecrit, il ecrit `"A_COMPLETER"` avec `T: 1`.

Donc la correction de l'auto-save est simple : ne PAS re-ecrire `"A_COMPLETER"` quand ca vient du front et que `T` etait 0 en BDD. Mais comme on corrige le point 1, le `codeTrajet` arrivera comme `null` (et non `"A_COMPLETER"`) pour les chantiers secondaires, donc l'auto-save ecrira correctement `T: 0, code_trajet: null`.

**La correction du point 1 suffit a casser la boucle de contamination.** Le point 2 est un filet de securite supplementaire.

### Correction finale simplifiee

#### Point 1 : `TimeEntryTable.tsx` ligne 772 (CAUSE RACINE)

```typescript
// AVANT
codeTrajet: ((j as any).code_trajet || "A_COMPLETER") as CodeTrajet,

// APRES  
codeTrajet: (T > 0 ? ((j as any).code_trajet || "A_COMPLETER") : ((j as any).code_trajet || null)) as CodeTrajet,
```

Si `T = 0` (case non cochee) → on garde `null`. Le front affiche "pas de trajet".  
Si `T > 0` (case cochee) → on met `"A_COMPLETER"` si pas de code. Le front affiche "a completer".

#### Point 2 : `useAutoSaveFiche.ts` lignes 403-404 (FILET DE SECURITE)

```typescript
// AVANT
T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0 : (dayData?.codeTrajet ? 1 : 0),
code_trajet: dayData?.codeTrajet ?? null,

// APRES
T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0 
   : (dayData?.codeTrajet && dayData.codeTrajet !== 'A_COMPLETER') ? 1 
   : (Number(dayData?.codeTrajet === 'A_COMPLETER' && Object.keys(dayData || {}).length > 0) ? 1 : 0),
```

Non, simplifions. Le `T` doit venir de l'etat "trajet" du front, pas du code. Regardons ce que `dayData` contient.

En fait dans le `TimeEntryTable`, quand la case trajet est cochee, `codeTrajet` est mis a `"A_COMPLETER"`. Quand elle est decochee, `codeTrajet` est `null`. Donc la logique actuelle `dayData?.codeTrajet ? 1 : 0` est correcte SAUF que le point 1 transformait `null` en `"A_COMPLETER"` a la lecture, ce qui faisait que meme sans case cochee, le code etait truthy.

**Conclusion : la correction du point 1 seul casse la boucle.** L'auto-save n'a pas besoin de changer car une fois que le front ne convertit plus `null` en `"A_COMPLETER"`, l'auto-save recevra `null` pour les chantiers secondaires et ecrira `T: 0, code_trajet: null`.

Le point 2 reste utile comme filet : empecher que `"A_COMPLETER"` seul (sans vrai choix utilisateur) ne mette `T: 1`.

### Plan final

#### Fichier 1 : `src/components/timesheet/TimeEntryTable.tsx` (ligne 772)

```typescript
codeTrajet: (T > 0 ? ((j as any).code_trajet || "A_COMPLETER") : ((j as any).code_trajet || null)) as CodeTrajet,
```

#### Fichier 2 : `src/hooks/useAutoSaveFiche.ts` (ligne 403)

Filet de securite : ne pas mettre `T: 1` si le seul code present est `"A_COMPLETER"` sans que la case trajet ait ete cochee.

```typescript
T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0 : (dayData?.codeTrajet && dayData.codeTrajet !== 'A_COMPLETER' ? 1 : (dayData?.codeTrajet === 'A_COMPLETER' ? 1 : 0)),
```

Cela revient au meme que l'actuel (`codeTrajet ? 1 : 0`). Donc en fait, grace au point 1, le point 2 est auto-corrige. Pas besoin de toucher l'auto-save.

#### Fichier 3 : `src/hooks/rhShared.ts` (lignes 679 et 735)

Filet de securite pour les donnees historiques deja contaminees en BDD.

**Ligne 679** : exclure `"A_COMPLETER"` du find reference multi-chantier :
```typescript
const entryAvecTrajet = entries.find(e => 
  (e.jour as any).code_trajet && (e.jour as any).code_trajet !== 'A_COMPLETER'
);
```

**Ligne 735** : ne compter un trajet dans `trajetsParCode` que si `T > 0` ou `trajet_perso` :
```typescript
const trajetActif = isChef && entries.length > 1
  ? entries.some(e => (Number(e.jour.T) || 0) > 0 || (e.jour as any).trajet_perso === true)
  : (Number(jourRef.T) || 0) > 0 || (jourRef as any).trajet_perso === true;

if (!isAbsent && trajetActif && (jourRefTrajet as any).code_trajet) {
```

#### Script SQL : nettoyage des donnees contaminees

```sql
UPDATE fiches_jours 
SET code_trajet = NULL, "T" = 0 
WHERE code_trajet = 'A_COMPLETER' 
  AND "T" = 1 
  AND (heures = 0 OR heures IS NULL);
```

Cible : les jours ou `code_trajet = 'A_COMPLETER'` et `T = 1` alors que les heures sont a 0 (chantiers secondaires contamines). Ne touche pas aux chantiers principaux (qui ont des heures > 0 et ou `A_COMPLETER` est legitime).

### Resume

| # | Fichier | Ce que ca fait |
|---|---------|----------------|
| 1 | TimeEntryTable.tsx L772 | Corrige la cause racine : `null` reste `null` si case trajet non cochee |
| 2 | rhShared.ts L679+735 | Filet de securite pour les anciennes donnees contaminees |
| 3 | Script SQL | Nettoie les donnees deja contaminees en BDD |

On ne touche PAS a : sync (deja correcte), auto-save (auto-corrige par le point 1), GD, T_PERSO, ni au systeme `codes_trajet_defaut`.

