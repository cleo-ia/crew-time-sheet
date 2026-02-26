

## Confirmation : zero regression

Le plan consiste a ajouter une **2e requete Supabase** dans le `queryFn` existant du hook `useAbsencesLongueDureePlanning.ts`, puis a fusionner les resultats dans la meme `Map<string, AbsenceLD>`. Voici pourquoi c'est sans risque :

### Analyse

**Seul fichier modifie** : `src/hooks/useAbsencesLongueDureePlanning.ts`

**Ce qui ne change pas** :
- La requete absences longue duree (lignes 28-33) reste strictement identique
- La boucle de calcul des jours LD (lignes 39-57) reste identique
- L'interface `AbsenceLD` (`{ dates: Set<string>, type: string }`) ne change pas
- La signature du hook (entree : `semaine`, sortie : `Map<string, AbsenceLD>`) ne change pas
- Aucun composant en aval n'est modifie (PlanningMainOeuvre, PlanningChantierAccordion, PlanningEmployeRow, AddEmployeeToPlanningDialog consomment tous la meme Map)

**Ce qui est ajoute** :
- Une 2e requete `.from("demandes_conges")` filtree sur `statut IN (VALIDEE_CONDUCTEUR, VALIDEE_RH)` + chevauchement semaine
- Une 2e boucle identique qui fusionne les jours de conges valides dans la meme Map (via `dates.add()`)
- La `queryKey` integre un marqueur supplementaire pour l'invalidation

**Pourquoi pas de regression** :

| Point de controle | Resultat |
|---|---|
| Requete absences LD modifiee ? | Non, intacte |
| Calcul jours LD modifie ? | Non, intact |
| Interface AbsenceLD modifiee ? | Non |
| Composants aval modifies ? | Aucun |
| Nouvelle table SQL ? | Non |
| Mutation modifiee ? | Non (lecture seule) |
| Si la requete conges echoue ? | Le `throw error` arrete le queryFn, meme comportement que si la requete LD echouait — React Query gere l'erreur |
| Si aucun conge valide ? | La 2e boucle ne fait rien, la Map ne contient que les LD comme avant |

Le rendu visuel est identique : un jour bloque par un conge CP affichera le meme `AbsenceIndicator` (icone Ban + tooltip "Absent — CP") qu'un jour bloque par un AT. Les composants ne font aucune distinction entre LD et conge classique — ils lisent la meme Map.

**Conclusion** : l'implementation est purement additive dans un seul fichier. Les absences longue duree continuent de fonctionner exactement comme avant.

