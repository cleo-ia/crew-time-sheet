

## Confirmation : zéro risque de régression

Le fix consiste en **deux changements purement mécaniques** :

1. **Batching de la requête** (lignes 426-430) : Au lieu d'un seul `.in("fiche_id", ficheIds)`, on découpe en paquets de 100 et on concatène. Le résultat final `joursData` contient **exactement les mêmes données** qu'avant, mais en plus complet (plus de troncature). La logique métier en aval ne change pas d'un seul caractère — elle reçoit juste le même tableau, potentiellement avec plus de lignes qu'avant (celles qui manquaient).

2. **Suppression des console.log** : Ce sont des logs de debug temporaires qui n'ont aucun effet sur le comportement de l'application.

**Pourquoi zéro régression :**
- Aucune modification de la logique de calcul (heures, trajets, absences, BTP)
- Aucune modification des types, interfaces, ou signatures de fonctions
- Aucun changement dans les composants UI
- Le seul effet observable : des salariés qui avaient des heures manquantes verront maintenant leurs heures correctes

### Modifications dans `src/hooks/rhShared.ts`

**Étape 1** — Remplacer la requête unique (lignes 426-432) par un batching par paquets de 100 :
```ts
const CHUNK_SIZE = 100;
let joursData: any[] = [];
for (let i = 0; i < ficheIds.length; i += CHUNK_SIZE) {
  const chunk = ficheIds.slice(i, i + CHUNK_SIZE);
  const { data, error } = await supabase
    .from("fiches_jours")
    .select("fiche_id, date, HNORM, HI, PA, repas_type, code_trajet, trajet_perso, heures, code_chantier_du_jour, ville_du_jour, type_absence, regularisation_m1, autres_elements, commentaire")
    .in("fiche_id", chunk)
    .limit(10000);
  if (error) throw error;
  if (data) joursData.push(...data);
}
```

**Étape 2** — Supprimer les 4 blocs de console.log temporaires (lignes 421-423, 507-510, 585, 598-613).

