

## Diagnostic : Ajout d'un log ciblé sur la boucle de traitement d'Aouel

### Ce qu'on sait maintenant
Les 3 premiers logs nous ont appris que le filtre finisseur n'est PAS la cause. L'affectationsMap est correcte, les dates passent le filtre. Le problème se situe donc entre le chargement des fiches et le calcul final des heures.

### Hypothèse restante
La fiche NUANCE S06 (`0138095b`) est dans `fichesBySalarie` (nbFiches=4), mais ses `fiches_jours` ne sont peut-être pas trouvées dans `joursData` (la variable qui stocke tous les jours récupérés de la base). Cela pourrait arriver si l'ID de cette fiche n'est pas dans `ficheIds` pour une raison inattendue.

### Modification à faire

Ajouter **un seul console.log** dans `src/hooks/rhShared.ts`, juste après la boucle de collecte des jours (après ligne 596), pour Aouel uniquement :

```js
// Après la boucle for (const fiche of fiches), ligne ~596
if (salarie.nom === "AOUEL MAHMOUD") {
  console.log(`[DEBUG-RH] AOUEL joursParDate:`, 
    [...joursParDate.entries()].map(([date, entries]) => ({
      date, 
      nbEntries: entries.length, 
      heures: entries.map(e => Number(e.jour.heures) || Number(e.jour.HNORM) || 0),
      ficheIds: entries.map(e => e.ficheId.substring(0, 8))
    }))
  );
  console.log(`[DEBUG-RH] AOUEL ficheIds dans boucle:`, 
    fiches.map(f => ({ id: f.id.substring(0, 8), chantier: (f as any).chantiers?.code_chantier }))
  );
}
```

Ce log montrera :
1. Quelles dates sont dans `joursParDate` (après tous les filtres) — on verra si Feb 2-3 sont absentes
2. Les IDs des fiches réellement itérées — on verra si la fiche NUANCE `0138095b` est bien là

Avec cette information, on saura exactement à quelle étape les 16h disparaissent et on pourra corriger.

### Étapes
1. Ajouter ce console.log ciblé dans rhShared.ts après ligne 596
2. Tu recharges la page RH → console → filtre "AOUEL"
3. On identifie la cause exacte et on fixe

