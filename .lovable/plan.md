

## Compréhension du problème

**Contexte** : Sébastien BOUILLET, chef multi-chantier (DAVOULT + MAILLARD), S10. Il a travaillé uniquement sur MAILLARD (8h/jour), 0h sur DAVOULT.

**Ce qui se passe aujourd'hui** :

1. **Déduplication chef** (`useRHData.ts` ligne 880) : quand deux `fiches_jours` existent pour la même date (un par chantier), le système garde le `ficheJourId` du **premier rencontré** (DAVOULT, car ordre alphabétique ou ordre de requête).

2. **Quand le RH saisit un code trajet** : `updateFicheJour.mutateAsync({ ficheJourId: day.ficheJourId, field: "code_trajet" })` écrit sur le `ficheJourId` de DAVOULT (0h) au lieu de MAILLARD (8h).

3. **Avec filtre chantier actif** : le code trajet affiché est recalculé (ligne 928 `trajetOnFilteredSite`) mais le `ficheJourId` utilisé pour l'écriture n'est PAS remplacé par celui du chantier filtré. Donc quand on filtre sur MAILLARD et qu'on saisit T31, ça écrit quand même sur DAVOULT.

4. **Sans filtre** : le `ficheJourId` pointe toujours vers DAVOULT (premier rencontré), donc les codes trajet atterrissent sur le chantier à 0h.

**Ce que tu veux** :

- **Avec filtre chantier actif** : le code trajet doit être écrit sur le `ficheJourId` du chantier filtré
- **Sans filtre chantier** : le code trajet doit être écrit sur le `ficheJourId` du chantier où le chef a des heures
- Le batch doit respecter la même logique
- Aucune régression sur les non-chefs ni les chefs mono-chantier

---

## Plan technique

### Fichier : `src/hooks/useRHData.ts`

Dans le bloc chef dedup (lignes 868-960), après la construction du `dayMap` :

1. **Stocker tous les `ficheJourId`s par date** : ajouter un champ `allFicheJourIds: Array<{ id: string, ficheId: string, heures: number }>` sur chaque entrée du `dayMap`. Le premier jour initialise le tableau, les suivants y ajoutent leur entrée.

2. **Résoudre le bon `ficheJourId` pour l'écriture** :
   - **Avec filtre chantier** (bloc `if (activeChantierFilter)`, ligne 903) : remplacer `jour.ficheJourId` par celui dont le `ficheId` correspond au chantier filtré
   - **Sans filtre** : après la boucle du `dayMap`, remplacer `jour.ficheJourId` par celui qui a le plus d'heures (celui du chantier actif)

3. **Exposer `allFicheJourIds`** dans les données retournées pour que le batch puisse cibler tous les enregistrements pertinents si nécessaire.

### Fichier : `src/components/rh/RHEmployeeDetail.tsx`

- Le `batchFicheJourIds` (ligne 361) utilise déjà `day.ficheJourId` — avec le fix ci-dessus, il pointera automatiquement vers le bon chantier.
- Le `onChange` unitaire (ligne 565) utilise aussi `day.ficheJourId` — même correction automatique.
- Pas de changement structurel nécessaire côté composant, le fix est entièrement dans le hook.

### Impact

- Chefs multi-chantiers : le `ficheJourId` exposé cible désormais le bon enregistrement
- Chefs mono-chantier : pas de changement (un seul `ficheJourId` par date)
- Non-chefs : pas de changement (pas de déduplication)
- Vue consolidée sans filtre : code trajet lu depuis le chantier avec heures (déjà le cas via `jourRefTrajet` dans `rhShared.ts`)

