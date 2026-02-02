
## Compréhension (je reformule ce que tu veux, en mode “règles simples”)

Quand le planning est **validé + synchronisé** pour une semaine donnée :

1) **Si un chantier a un chef** (chef_id renseigné)  
   → l’équipe doit être gérée côté **Saisie hebdomadaire** par **ce chef**  
   → chaque maçon n’a que les jours planifiés “1” sur ce chantier  
   → les autres jours doivent apparaître en **lecture seule**, fond **jaune pâle**, badge **“Jour non affecté”**  
   → aucun “39h fantôme”.

2) **Si un chantier n’a pas de chef** (chef_id = NULL)  
   → l’équipe doit être gérée côté **conducteur** (/validation-conducteur) par le conducteur du chantier.

Oui, c’est clair et je confirme que je comprends exactement ce que tu veux.

---

## Pourquoi BABAY a disparu après le dernier changement (et pourquoi ce n’est pas “le planning multi-chantier” qui est cassé)

Le bug actuel vient d’une incohérence entre :
- le **planning** (planning_affectations)  
- et le **routage équipe** (chantiers.chef_id + affectations_jours_chef)

### Preuve (données réelles en base pour S07)
Pour **S07** :
- **LE ROSEYRAN** (CI230ROSEYRAN) a actuellement `chantiers.chef_id = Philippe FAY`
- Or, dans le planning S07, le chef affecté sur ROSEYRAN est **Philippe DURAND** (5 jours)

Donc aujourd’hui, la synchronisation et les affectations jours sont “routées” vers **FAY**, pas vers **DURAND** :
- `affectations_jours_chef` de BABAY sur ROSEYRAN existent bien (2 jours) **mais avec chef_id = FAY**
- et une fiche BABAY/ROSEYRAN existe mais **user_id = FAY** et (actuellement) **0 jour en fiches_jours**

Après notre dernier correctif frontend (filtrage par chef_id), quand tu sélectionnes DURAND :
- la requête planning (`affectations_jours_chef` filtrée par chef_id=Durand) ne trouve plus BABAY
→ il “disparaît”.

Donc ce qu’on a “cassé”, c’est qu’on a rendu visible une incohérence déjà présente : le système routait ROSEYRAN vers le mauvais chef, et le frontend ne filtrait pas assez strictement avant.

---

## Cause racine technique (là où il faut corriger pour respecter tes règles)

Dans l’Edge Function **`sync-planning-to-teams`** :
- le routage des maçons vers `affectations_jours_chef` utilise **`chantiers.chef_id`**
- et l’auto-assignation du chef ne se fait que si `chantiers.chef_id` est **NULL** :
  ```ts
  if (employe.role_metier === 'chef' && chantier && !chantier.chef_id) {
    update chantiers set chef_id = employeId
  }
  ```
Donc si un chantier a déjà un chef_id (même ancien / incorrect), la sync **n’écrase jamais** ce chef_id, même si le planning validé dit le contraire.

C’est exactement le cas de ROSEYRAN : chef_id déjà renseigné (FAY), donc la sync n’a pas basculé vers DURAND.

---

## Solution (celle qui respecte exactement tes 3 écrans)

### Objectif
Faire en sorte que **la synchronisation rende cohérent** :
- `planning_affectations` (qui dit quel chef est sur quel chantier cette semaine)
avec
- `chantiers.chef_id` (qui sert de source de vérité “chef vs conducteur” dans l’app)
et
- `affectations_jours_chef` + `fiches.user_id` (qui routent l’équipe côté saisie).

### Changement principal (Edge Function)
Modifier `supabase/functions/sync-planning-to-teams/index.ts` pour :

1) **Déterminer le chef “responsable” par chantier pour la semaine S**
   - À partir de `planning_affectations` + join `utilisateurs.role_metier`
   - Pour chaque chantier :
     - prendre les entrées où `role_metier = 'chef'`
     - si plusieurs chefs : choisir celui avec **le plus grand nombre de jours** (règle déterministe, stable)

2) **Mettre à jour `chantiers.chef_id` avant de router l’équipe**
   - Si `plannedChefId` existe et est différent du `chef_id` actuel :
     - `UPDATE chantiers SET chef_id = plannedChefId WHERE id = chantierId`
   - Si aucun chef n’est planifié sur le chantier :
     - et si tu veux strictement ton écran 4, alors pour les chantiers présents dans le planning de la semaine :
       - `UPDATE chantiers SET chef_id = NULL WHERE id = chantierId`
     - (c’est optionnel selon si tu veux que “pas de chef cette semaine” = conducteur ; tu l’as demandé, donc je le propose)

3) **Migrer les données de la semaine courante quand le chef change**
   Sinon, même si on change `chef_id`, les fiches restent “appartenant” à l’ancien chef et l’écran ne retrouve plus rien (car `useFicheId` filtre par `user_id`).
   - Pour le chantier concerné et la semaine courante :
     - `UPDATE fiches SET user_id = plannedChefId WHERE chantier_id = ... AND semaine = currentWeek`
     - `UPDATE affectations_jours_chef SET chef_id = plannedChefId WHERE chantier_id = ... AND semaine = currentWeek`
   Cela remet tout en cohérence immédiatement.

4) **Corriger le cas “copie S-1 → S”**
   Dans `copyFichesFromPreviousWeek`, quand on crée la fiche S, le code met actuellement :
   - `user_id: ficheS1.user_id`
   Ce qui propage un ancien chef même si le chantier a changé de chef.
   On doit changer pour :
   - `user_id: chantier.chef_id` (chef courant) quand il existe.

Résultat attendu :
- ROSEYRAN → chef = DURAND (comme ton screen 2), équipe côté saisie chef
- ROMANCHES → chef = FAY (comme ton screen 3), équipe côté saisie chef
- BALCONS DE L’OISANS → chef = NULL, équipe côté conducteur (screen 4)

---

## Pourquoi ça corrige “BABAY invisible” ET “39h fantômes” sans casser le reste
- Le frontend (nos derniers changements) devient correct dès que le backend est cohérent :
  - `useMaconsByChantier` filtrera par le bon chef_id
  - `TimeEntryTable` et `Index.tsx` ne pourront plus “inventer 5 jours”
- On ne dépend plus d’un état “historique” de `chantiers.chef_id` qui peut être obsolète.

---

## Plan d’exécution (implémentation + réparation des données)

### Étape 1 — Corriger l’Edge Function
- Modifier `sync-planning-to-teams` :
  - calcul `plannedChefByChantier`
  - updates `chantiers.chef_id`
  - migration `fiches.user_id` + `affectations_jours_chef.chef_id` pour la semaine courante
  - correction `copyFichesFromPreviousWeek` pour user_id

### Étape 2 — Redéployer l’Edge Function
- Déployer `sync-planning-to-teams`

### Étape 3 — Réparer S07 en relançant la sync
- Relancer la sync en **mode force** sur `2026-S07` (pour régénérer et rerouter proprement)

### Étape 4 — Vérifications (tests ciblés)
1) **ROSEYRAN / S07 / Chef DURAND**
   - BABAY apparaît
   - Lundi + Mardi éditables
   - Mer/Jeu/Ven “Jour non affecté” (jaune + badge)
   - total ≈ 16h (ou 0h si aucune heure saisie, mais surtout pas 39h)
2) **ROMANCHES / S07 / Chef FAY**
   - BABAY apparaît
   - Mer/Jeu/Ven éditables, L/M non affectés
3) **BALCONS DE L’OISANS / S07 / Conducteur Romain DYE**
   - équipe visible côté conducteur uniquement
4) Vérifier qu’une transmission/signature ne prend que les jours planifiés.

---

## Notes / garde-fous (important)
- Le problème actuel montre aussi un point dangereux : si on ouvre une saisie avec le “mauvais chef”, l’auto-save peut nettoyer des jours (zéro tolérance).  
  La correction backend (routage cohérent) réduit fortement ce risque, car les chefs verront les bons chantiers et les bons employés.
- Si tu veux une sécurité supplémentaire, on pourra ensuite ajouter une règle UI : “si planning actif et selectedChef != chef_id du chantier → lecture seule + message”, mais ce n’est pas nécessaire pour résoudre le bug principal si la sync est corrigée.

---

## Fichiers concernés
- `supabase/functions/sync-planning-to-teams/index.ts` (principal)
- (retest uniquement) les pages déjà modifiées :
  - `src/hooks/useMaconsByChantier.ts`
  - `src/components/timesheet/TimeEntryTable.tsx`
  - `src/pages/Index.tsx`
  - `src/pages/SignatureMacons.tsx`
