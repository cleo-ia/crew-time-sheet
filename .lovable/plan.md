

## Problème

Le badge "Principal/Secondaire" sur un chef multi-chantiers ne fonctionne qu'en sens unique : Secondaire → Principal. Un clic sur "Principal" ne fait rien car le code bloque explicitement l'action (`if (!isChantierPrincipal)`).

## Solution : Toggle bidirectionnel

### 1. Hook `useSetChantierPrincipal.ts` — Ajouter le support "unset"

Ajouter un nouveau hook `useUnsetChantierPrincipal` (ou modifier l'existant) pour accepter `chantierId: string | null`. Quand `chantierId` est `null`, on met `chantier_principal_id = null` dans `utilisateurs`, ce qui retire le statut principal du chef et le repasse en mode "pas de chantier principal défini" (= tous ses chantiers sont équivalents).

### 2. Composant `PlanningEmployeRow.tsx` — Débloquer le clic sur "Principal"

Ligne 140 : retirer la condition `!isChantierPrincipal` pour permettre le clic dans les deux sens. Quand le badge est "Principal", le clic appellera un callback `onUnsetChantierPrincipal` qui mettra `chantier_principal_id` à `null`.

### 3. Composant `PlanningChantierAccordion.tsx` — Passer le callback d'unset

Ajouter la logique pour distinguer le clic "set principal" vs "unset principal" et appeler la mutation appropriée.

### Détails techniques

**`useSetChantierPrincipal.ts`** : Modifier pour accepter `chantierId: string | null`. Si `null`, on update `chantier_principal_id` à `null` et on ne touche pas à `chantiers.chef_id`. Toast adapté ("Chantier principal retiré").

**`PlanningEmployeRow.tsx`** (ligne 138-143) :
```tsx
onClick={(e) => {
  e.stopPropagation();
  if (isChantierPrincipal && onSetChantierPrincipal) {
    // Déjà principal → retirer le statut
    onUnsetChantierPrincipal?.(employe.id);
  } else if (!isChantierPrincipal && onSetChantierPrincipal) {
    onSetChantierPrincipal(employe.id);
  }
}}
```

**Nouveau prop** `onUnsetChantierPrincipal` dans `PlanningEmployeRow` et `PlanningChantierAccordion`.

**`PlanningChantierAccordion.tsx`** : Appeler `unsetChantierPrincipal({ employeId })` qui met `chantier_principal_id = null`.

### Impact

- Quand un chef n'a plus de `chantier_principal_id`, `isMultiChantierChef` sera `false` → les badges Principal/Secondaire disparaissent (comportement normal d'un chef mono-chantier ou sans principal défini).
- La sync planning traitera ce chef comme n'ayant pas de distinction principal/secondaire (heures normales partout).

