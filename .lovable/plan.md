

## Plan : Ajouter 3 console.log de debug dans rhShared.ts

### Modifications dans `src/hooks/rhShared.ts`

**Log 1 — Après ligne 419** (après construction de `affectationsMap`) :
```js
console.log("[DEBUG-RH] affectationsMap:", 
  [...affectationsMap.entries()].map(([id, dates]) => ({ id, dates: [...dates] }))
);
```
→ Montre toutes les dates affectées par finisseur. On vérifie si le 2 et 3 février sont bien là pour Aouel.

**Log 2 — Après ligne 498** (quand on identifie un finisseur dans la boucle) :
```js
if (isFinisseur) {
  const datesAff = affectationsMap.get(salarieId);
  console.log(`[DEBUG-RH] Finisseur: ${salarie.nom} ${salarie.prenom}, salarieId=${salarieId}, isFinisseur=${isFinisseur}, nbFiches=${fichesSalarie.length}, datesAffectees=`, datesAff ? [...datesAff] : "AUCUNE");
}
```
→ Pour chaque finisseur, montre combien de fiches et quelles dates affectées.

**Log 3 — À la ligne 576** (quand un jour est ignoré par le filtre finisseur) :
```js
console.log(`[DEBUG-RH] JOUR IGNORÉ: ${salarie.nom} ${salarie.prenom}, date=${jour.date}, salarieId=${salarieId}, datesAffectees=`, [...(affectationsMap.get(salarieId) || [])]);
```
→ Le plus important : montre exactement quel jour est exclu et pourquoi.

### Étapes après déploiement
1. Tu recharges la page RH consolidée sur février
2. Tu ouvres la console (F12 → Console)
3. Tu tapes "DEBUG-RH" dans le filtre de la console
4. Tu me montres un screenshot des résultats

