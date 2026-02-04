
Objectif
- Comprendre pourquoi, même après clic sur “Enregistrer ce chantier”, certains employés reviennent à 39h au retour sur l’onglet.
- Corriger pour que le bouton manuel sauvegarde et que l’affichage au retour reflète systématiquement la BDD.

Constat (ce que je vois dans le code + ce que montrent les logs)
- Le bouton “Enregistrer ce chantier” appelle `useSaveChantierManuel.saveChantier(...)` (ValidationConducteur.tsx).
- Les logs console confirment que la sauvegarde s’exécute et “réussit” :
  - `[SaveChantierManuel] Saving 14 employees...`
  - `[SaveChantierManuel] ✅ Saved 14 employees...`
- Les network logs montrent bien des employés à 40h en BDD (ex: total_heures=40, HNORM=9/8/8/8/7).
- Pourtant, au retour sur “Mes heures”, certains repassent à 39h → donc le problème n’est pas “le bouton ne fait rien”, mais plutôt “le front recharge/affiche une autre source (cache ou mauvaise fiche) pour certains employés”.

Causes probables (2 problèmes qui peuvent se cumuler)

1) Cache React Query non invalidé pour la liste des finisseurs du conducteur
- Les données de l’écran conducteur viennent de `useFinisseursByConducteur(conducteurId, semaine)` avec la clé :
  - `["finisseurs-conducteur", conducteurId, semaine]`
- Ce hook a `staleTime: 30000` et `refetchOnMount: true` (donc il ne refetch pas forcément si le cache est encore “frais”).
- Or, après une sauvegarde manuelle, on invalide `["fiches"]` (dans `useSaveFiche`) mais pas `["finisseurs-conducteur", ...]`.
- Résultat typique :
  - tu sauvegardes (BDD OK),
  - tu changes d’onglet puis reviens rapidement,
  - le hook réutilise le cache encore “frais” (qui contient l’ancien 39h) → impression que ça n’a pas sauvegardé.

2) Mauvaise fiche sélectionnée quand un finisseur a plusieurs fiches la même semaine
- Dans `useFinisseursByConducteur`, pour chaque finisseur, on fait :
  - `select ... from fiches where semaine=... and salarie_id=... order by chantier_id desc, created_at desc`
  - puis on prend `fichesEmploye?.[0]`
- Si un finisseur a plusieurs fiches pour la semaine (ex: multi-chantiers, legacy, doublons historiques), l’ordre “chantier_id desc” peut faire sélectionner une fiche qui n’est pas celle que tu viens d’enregistrer.
- Résultat :
  - tu as bien sauvegardé la bonne fiche (celle du chantier du groupe),
  - mais au rechargement, le front lit une autre fiche (restée à 39h) → impression de sauvegarde partielle / aléatoire selon les employés.

Correctifs proposés (sans revenir à l’auto-save, uniquement fiabiliser le bouton)

A) Invalider explicitement le bon cache après “Enregistrer ce chantier”
- Dans `useSaveChantierManuel` (après `saveFiche.mutateAsync` + trajets), invalider :
  - `["finisseurs-conducteur", conducteurId, selectedWeek]`
  - potentiellement aussi les requêtes `["affectations-finisseurs-jours", ...]` si elles existent avec ces clés (à vérifier via recherche).
- But : au retour d’onglet, l’écran refetch et affiche ce qui est réellement en BDD.

B) Sélectionner la fiche “attendue” côté conducteur au lieu de prendre arbitrairement la première
- Modifier `useFinisseursByConducteur` pour choisir la fiche selon le chantier “principal” de la semaine pour ce finisseur :
  - `preferredChantierId = finisseur.affectedDays?.[0]?.chantier_id`
  - parmi `fichesEmploye`, prendre d’abord celle dont `chantier_id === preferredChantierId`
  - fallback : comportement actuel si aucune correspondance
- But : au retour, on lit la même fiche que celle que le bouton “Enregistrer ce chantier” met à jour pour ce groupe.

C) Scoper les affectations (et donc le filtrage des jours) au chantier du groupe
- Aujourd’hui, dans ValidationConducteur, on passe à `TimeEntryTable` et au `saveChantier` des `affectationsJours` filtrées par finisseurs, mais pas forcément par chantier.
- Corriger pour filtrer aussi par `chantier_id === chantierId` (sauf cas “sans-chantier”).
- But : éviter qu’un finisseur multi-chantier mélange ses jours dans le mauvais groupe, ce qui peut provoquer des écritures/lectures incohérentes.

D) Fiabiliser la prise en compte des toutes dernières modifications (cas “je tape puis j’enregistre”)
- Les champs heures utilisent `EditableNumber` qui “commit” la valeur au `blur`.
- Au clic sur “Enregistrer ce chantier”, selon le focus, le blur + mise à jour React peut arriver trop tard par rapport à la lecture de `timeEntries` dans le handler.
- Correctif simple : dans le `onClick` du bouton
  1) forcer `document.activeElement?.blur()`
  2) attendre un micro-délai (ex: `await new Promise(requestAnimationFrame)` ou `setTimeout(0)`)
  3) seulement ensuite appeler `saveChantier(...)`
- But : garantir que la dernière cellule modifiée est bien intégrée aux `timeEntries` envoyées à la sauvegarde.

E) Ajout de logs de diagnostic (temporaire)
- Dans `useSaveChantierManuel`, juste avant `saveFiche.mutateAsync`, logger :
  - la liste des employés réellement inclus (ids)
  - pour chacun : somme des heures envoyées + détail des dates envoyées
- But : si un employé “revient à 39h”, on saura si :
  - on l’a envoyé avec 39 (front pas à jour),
  - ou on l’a envoyé avec 40 mais on relit une autre fiche (sélection de fiche),
  - ou cache non rafraîchi.

Fichiers à modifier
- src/hooks/useSaveChantierManuel.ts
  - Invalidate queries `finisseurs-conducteur` après succès
  - (optionnel) logs détaillés
- src/hooks/useFinisseursByConducteur.ts
  - Sélectionner la fiche correspondant au chantier attendu (affectedDays[0].chantier_id) au lieu de prendre `fichesEmploye[0]`
- src/pages/ValidationConducteur.tsx
  - Filtrer `affectationsJours` par chantier pour chaque bloc chantier
  - Forcer blur + attendre 1 frame avant d’appeler `saveChantier`

Séquence de test (reproductible)
1) Aller sur /validation-conducteur?tab=mes-heures&semaine=2026-S06
2) Mettre 2-3 employés à 40h (dont au moins un qui “revert” habituellement)
3) Cliquer “Enregistrer ce chantier”
4) Changer d’onglet, revenir immédiatement
5) Attendu : tous restent à 40h
6) Refaire mais en modifiant une cellule puis en cliquant tout de suite “Enregistrer” (test du blur/commit)
7) Si possible, tester un finisseur multi-chantier (si vous en avez) : vérifier que le groupe chantier affiche la bonne fiche.

Critère de réussite
- Après sauvegarde manuelle, retour d’onglet = mêmes totaux pour tous les employés modifiés (plus de retours aléatoires à 39h).
- Les employés “problématiques” restent cohérents entre la fiche sauvegardée et la fiche relue (même chantier).

Notes importantes
- Ce plan ne réactive pas l’auto-save conducteur : on sécurise uniquement le flux “bouton”.
- Les correctifs A + B sont les plus critiques (cache + mauvaise fiche). C et D renforcent la cohérence et évitent des cas limites.
