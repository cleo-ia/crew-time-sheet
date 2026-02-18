
# Plan complet : Chef multi-chantier - Saisie des heures sur tous les chantiers

## Resume du probleme

Le chef multi-chantier ne peut pas saisir ses heures sur son chantier secondaire. Tout est bloque a 0h en lecture seule. Du coup, toutes ses heures sont comptees sur un seul chantier, ce qui fausse la ventilation analytique.

## Ce qu'on veut obtenir

Le chef peut saisir ses heures reelles sur CHAQUE chantier (ex: 4h chantier A + 4h chantier B le meme jour). Le systeme de chantier principal/secondaire reste dans le planning, mais **le blocage de saisie est supprime**.

## Les 7 points d'impact identifies (avec risques RH)

### 1. TimeEntryTable.tsx - Debloquer la saisie (PRIORITE 1)
**Probleme actuel** : Quand `isChefOnSecondaryChantier = true`, les heures sont forcees a 0h et les jours sont en lecture seule.

**Corrections** :
- Supprimer la query `chef-chantier-principal` (lignes 258-274)
- Supprimer le memo `isChefOnSecondaryChantier` (lignes 277-280)
- Supprimer les heures par defaut a 0h pour le chef secondaire (lignes 506-525) : le chef aura les memes heures par defaut que les autres (8/8/8/8/7)
- Supprimer le blocage `isChefBlockedOnSecondary` dans `isDayBlocked` (ligne 1236)
- Supprimer le message "Saisie sur votre chantier principal uniquement" (lignes 1254-1258)
- Supprimer le style bleu special (ligne 1245)

**Risque** : Aucun pour les chefs mono-chantier (`isChefOnSecondaryChantier` retournait deja `false`)

### 2. useAutoSaveFiche.ts - Autoriser la sauvegarde (PRIORITE 1)
**Probleme actuel** : Le bloc "EXCEPTION CHEF PRINCIPAL" (lignes 318-335) donne 5 jours uniquement sur le chantier principal. Sur le secondaire, le chef n'a pas d'`affectations_jours_chef` (contrainte UNIQUE), donc `selectedDays = []` et rien n'est sauvegarde.

**Correction** :
- Remplacer la logique : si l'employe est le chef (`entry.employeeId === chefId`), toujours autoriser les 5 jours (`selectedDays = workDays`), **quel que soit le chantier** (principal ou secondaire)
- Cela remplace l'ancien test `chefUserData?.chantier_principal_id === chantierId` par un simple `entry.employeeId === chefId`

**Risque** : Le chef pourra effectivement saisir 8h sur 2 chantiers le meme jour (total 16h). C'est voulu : c'est sa responsabilite d'etre precis.

### 3. SignatureMacons.tsx - Supprimer les indicateurs "Indicatif" (PRIORITE 2)
**Corrections** :
- Supprimer la query `chef-chantier-principal-signature` (lignes 50-65)
- Supprimer `isChantierSecondaire` (ligne 68)
- Supprimer le badge "Indicatif" (lignes 428-432)
- Supprimer le message "Heures non comptabilisees" (lignes 434-437)
- Supprimer le bandeau AlertTriangle (lignes 442-456)
- Supprimer le badge "Chantier principal" pour les jours a 0h (lignes 476-479)

**Risque** : Aucun. On supprime juste de l'UI informative.

### 4. rhShared.ts - Consolidation RH (CRITIQUE - PRIORITE 1)
**Probleme actuel** : La deduplication par date (lignes 464-471) fait que si un chef a 2 fiches pour la meme semaine (une par chantier), le systeme garde UNE SEULE ligne par date (celle avec le meilleur statut). 

**Scenario problematique avec notre modification** :
- Lundi : Chef fait 4h sur chantier A (fiche A) + 4h sur chantier B (fiche B)
- La deduplication garde seulement la fiche A (ENVOYE_RH priorite 4) = 4h au lieu de 8h
- Pire : si fiche A a 0h ce jour = fiche B ignoree, le chef est compte "absent"

**Correction** :
- Pour les chefs multi-chantier, **sommer les heures par date** au lieu de dedupliquer
- Concretement : quand un meme jour a des donnees dans plusieurs fiches, additionner `heures`, `HNORM`, `HI`, `T`, combiner les paniers et trajets
- Compter "absent" uniquement si la somme totale des heures sur tous les chantiers est 0 pour ce jour
- Conserver la deduplication pour les non-chefs (comportement inchange)
- Fusionner les `detailJours` par date : un seul `EmployeeDetail` par jour avec les heures totales et les codes chantier combines

**Impact positif** : Les 5 jours max par semaine sont naturellement respectes car les dates sont uniques (lundi = 1 seule ligne apres somme, meme si 2 chantiers)

### 5. Ventilation analytique (useVentilationAnalytique.ts) - PAS DE MODIFICATION NECESSAIRE
**Bonne nouvelle** : Ce hook fonctionne directement sur `fiches_jours.code_chantier_du_jour` et `HNORM`, en aggregeant par (employe, chantier). Si le chef a 4h sur chantier A et 4h sur chantier B, les `fiches_jours` ont deja le bon `code_chantier_du_jour` par fiche. La ventilation sera naturellement correcte.

### 6. Export Excel RH (useRHExport.ts) - IMPACT INDIRECT VIA rhShared
L'export appelle `buildRHConsolidation()` de rhShared.ts. Avec la correction du point 4, les totaux seront corrects automatiquement. Pas de modification specifique necessaire.

### 7. Export heures supp BTP (calculateHeuresSuppBTP) - A VERIFIER
La fonction `calculateHeuresSuppBTP` dans rhShared.ts travaille sur `detailJours` et groupe par semaine ISO. Avec la fusion des jours (point 4), chaque date apparait une seule fois avec les heures totales. Le calcul des 35h/semaine sera correct car il somme les heures par semaine, pas par chantier.

## Ce qui ne change PAS (zero regression)

- Planning : badges Principal/Secondaire restent
- sync-planning-to-teams : aucune modification
- Contrainte UNIQUE(macon_id, jour) : aucune modification
- Conducteur : aucun impact
- Macons/Finisseurs/Grutiers : aucun impact (la logique supprimee ne les concernait pas)
- Chefs mono-chantier : aucun impact (`isChefOnSecondaryChantier` retournait deja `false`)
- La colonne `chantier_principal_id` en BDD : reste en place, toujours utilisee dans le planning
- useSetChantierPrincipal : reste en place

## Ordre d'implementation

1. **rhShared.ts** : Corriger la consolidation pour sommer les heures multi-chantier des chefs
2. **TimeEntryTable.tsx** : Supprimer le blocage secondaire
3. **useAutoSaveFiche.ts** : Simplifier l'exception chef (autoriser 5 jours sur tous les chantiers)
4. **SignatureMacons.tsx** : Supprimer les indicateurs "Indicatif"
5. Test complet sur S08

## Resume des risques

| Zone | Risque | Mitigation |
|---|---|---|
| Chef mono-chantier | Nul | La logique supprimee etait deja inactive |
| Autres roles | Nul | Aucun code les concernant n'est modifie |
| RH consolidation | **Eleve sans correction** | Point 4 : sommer au lieu de dedupliquer pour les chefs |
| Ventilation | Nul | Fonctionne deja sur fiches_jours par chantier |
| Export Excel | Nul | Herite de la correction rhShared |
| Heures supp | Nul | Travaille sur detailJours fusionnes = correct |
| Max 5 jours/semaine | Nul | Les dates sont uniques apres fusion par date |
