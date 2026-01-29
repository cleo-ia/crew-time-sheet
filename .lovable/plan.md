
# Plan : Badge dynamique par entreprise dans le Planning S+1

## Contexte
Actuellement, le badge vert dans le Planning Main d'Oeuvre affiche toujours "LR: X" (Limoge Revillon), même quand l'utilisateur est connecté à une autre entreprise comme SDER.

## Objectif
Afficher dynamiquement l'abréviation de l'entreprise courante (LR, SDER, EB) dans le badge de compteur d'employés.

---

## Modifications à effectuer

### 1. Ajouter le champ `shortName` au type de configuration

**Fichier** : `src/config/enterprises/types.ts`

Ajouter un nouveau champ optionnel `shortName` dans l'interface `EnterpriseConfig` :
- Ce champ contiendra l'abréviation courte de l'entreprise (2-4 caractères)
- Exemples : "LR" pour Limoge Revillon, "SDER" pour SDER, "EB" pour Engo Bourgogne

### 2. Mettre à jour les configurations des entreprises

**Fichiers** :
- `src/config/enterprises/limoge-revillon.ts` → ajouter `shortName: 'LR'`
- `src/config/enterprises/sder.ts` → ajouter `shortName: 'SDER'`
- `src/config/enterprises/engo-bourgogne.ts` → ajouter `shortName: 'EB'`

### 3. Modifier le composant PlanningChantierAccordion

**Fichier** : `src/components/planning/PlanningChantierAccordion.tsx`

1. Importer le hook `useEnterpriseConfig` depuis `@/hooks/useEnterpriseConfig`
2. Récupérer l'abréviation de l'entreprise courante : `const { shortName } = useEnterpriseConfig()`
3. Remplacer le texte codé en dur "LR:" par `{shortName}:`

---

## Résultat attendu

| Entreprise connectée | Badge affiché |
|---------------------|---------------|
| Limoge Revillon | **LR: 0** |
| SDER | **SDER: 0** |
| Engo Bourgogne | **EB: 0** |

---

## Détails techniques

### Fichiers modifiés
1. `src/config/enterprises/types.ts` - Ajout du champ `shortName?: string`
2. `src/config/enterprises/limoge-revillon.ts` - Ajout de `shortName: 'LR'`
3. `src/config/enterprises/sder.ts` - Ajout de `shortName: 'SDER'`
4. `src/config/enterprises/engo-bourgogne.ts` - Ajout de `shortName: 'EB'`
5. `src/components/planning/PlanningChantierAccordion.tsx` - Utilisation dynamique du shortName

### Impact
- Aucun changement de logique métier
- Le badge s'adaptera automatiquement à l'entreprise connectée
- Cohérent avec l'architecture multi-tenant existante
