
# Plan : Ajouter l'exception "Chef sur chantier principal" dans useAutoSaveFiche

## Rappel de la règle métier

Le chef multi-chantiers est **volontairement** affecté 5 jours sur tous ses chantiers dans le planning (car imprévus possibles). Seules les heures saisies sur son **chantier principal** comptent pour la paie RH.

Le problème actuel : `useAutoSaveFiche` filtre par `affectations_jours_chef` avec `chantier_id`, mais pour le chef lui-même, cette table peut ne pas contenir d'entrées pour son chantier principal (il est affecté via `planning_affectations`, pas `affectations_jours_chef`).

## Cause racine identifiée

Dans `src/hooks/useAutoSaveFiche.ts` (lignes 317-349), quand le planning est actif :
- Le code cherche les jours assignés dans `affectations_jours_chef` 
- Si aucune entrée n'est trouvée → `selectedDays = []` → aucune sauvegarde
- **Il n'y a AUCUNE exception pour le chef sur son chantier principal**

## Solution

Ajouter une condition **AVANT** la vérification des affectations :

```text
SI l'employé courant EST le chef (entry.employeeId === chefId)
   ET le chantier courant EST son chantier principal (chantierId === chantier_principal_id)
   ALORS selectedDays = [Lundi, Mardi, Mercredi, Jeudi, Vendredi]
SINON
   Logique normale (vérification affectations_jours_chef)
```

## Fichier à modifier

`src/hooks/useAutoSaveFiche.ts`

## Changements techniques

### Étape 1 : Récupérer le chantier_principal_id du chef (1 requête)

Au début du traitement, récupérer le `chantier_principal_id` de l'utilisateur `chefId` :

```typescript
// Avant la boucle sur les employés (vers ligne 95)
let chefPrincipalChantierId: string | null = null;
const { data: chefData } = await supabase
  .from("utilisateurs")
  .select("chantier_principal_id")
  .eq("id", chefId)
  .maybeSingle();
if (chefData) {
  chefPrincipalChantierId = chefData.chantier_principal_id;
}
```

### Étape 2 : Exception chef principal (dans la boucle)

Dans la logique de sélection des jours (ligne 317), ajouter :

```typescript
if (!isPlanningActive) {
  selectedDays = [...workDays];
} else {
  // ✅ EXCEPTION CHEF PRINCIPAL : Si l'employé est le chef ET 
  // le chantier courant est son chantier principal → tous les jours autorisés
  const isChefOnPrincipalChantier = 
    entry.employeeId === chefId && 
    chantierId === chefPrincipalChantierId;
  
  if (isChefOnPrincipalChantier) {
    selectedDays = [...workDays];
    console.log(`[AutoSave] Chef ${entry.employeeName} sur son chantier principal, 5 jours autorisés`);
  } else {
    // Logique normale : vérifier affectations_jours_chef
    // ... code existant lignes 319-349 ...
  }
}
```

## Comportement après correction

| Scénario | Avant | Après |
|----------|-------|-------|
| Chef saisit sur son chantier principal | `selectedDays = []` → rien sauvé | `selectedDays = [L,M,M,J,V]` → 5 jours sauvés |
| Chef saisit sur chantier secondaire | Vérifie affectations → dépend du planning | Inchangé |
| Maçon saisit (n'importe quel chantier) | Vérifie affectations normalement | Inchangé |
| Chef sans chantier principal défini | Vérifie affectations normalement | Inchangé |

## Garanties

1. **Aucune régression sur les maçons** : La condition `entry.employeeId === chefId` garantit que seul le chef est concerné
2. **Aucune régression sur les chantiers secondaires** : La vérification `chantierId === chefPrincipalChantierId` garantit que l'exception ne s'applique qu'au chantier principal
3. **Cohérence avec l'affichage** : Le badge "Mes heures" dans `ChantierSelector.tsx` utilise exactement la même logique
4. **Performance** : Une seule requête supplémentaire par sauvegarde (pas dans la boucle)

## Plan de test recommandé

1. Purger SDER S07 une dernière fois
2. Philippe DURAND saisit 40h sur CI229BALME (son chantier principal avec badge "Mes heures")
3. Cliquer "Enregistrer maintenant"
4. **Vérification 1** : Rafraîchir la page → les 40h du chef doivent persister
5. **Vérification 2** : Vérifier que les autres membres de l'équipe sont aussi sauvegardés
6. Tester "Enregistrer et signer" → vérifier cohérence récap signature / historique / conducteur
