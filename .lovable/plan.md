
Objectif: corriger le clignotement de l’onglet "Inventaire" côté conducteur sans toucher au module inventaire lui-même.

Constat
- Le problème vient très probablement de `src/pages/ValidationConducteur.tsx`, pas de `InventoryDashboard`.
- Cette page a aujourd’hui plusieurs sources de vérité concurrentes pour l’onglet actif :
  1. l’état local `activeMainTab`
  2. le `tab` dans l’URL
  3. l’effet de deep-link qui force parfois `"validation"` ou `"mes-heures"`
  4. le `navigate(...)` dans `onValueChange`
  5. le `navigate(...)` dans l’effet de sync URL
- Le replay montre des re-renders complets à chaque clic, ce qui correspond bien à une compétition entre effets/navigation.
- Le point fragile visible dans le code: l’effet qui lit `searchParams` gère explicitement `validation` et `mes-heures`, mais pas `inventaire`. Donc dès qu’un autre cycle relit les params, l’onglet peut repartir sur une logique par défaut.

Approche de correction
1. Unifier la logique d’onglet dans `ValidationConducteur.tsx`
- Créer une seule fonction de normalisation du tab URL:
  - valeurs autorisées: `mes-heures`, `validation`, `inventaire`
  - fallback:
    - si deep-link ancien format (`chantier` / `semaine`) sans tab: `validation`
    - sinon: `mes-heures`

2. Supprimer la double navigation
- Garder une seule mécanique de synchronisation URL.
- Soit via `setSearchParams`, soit via un seul `navigate`, mais pas dans `onValueChange` et dans un `useEffect` en même temps.
- Le plus sûr: au clic, mettre seulement l’état + écrire les params une fois; retirer l’effet qui renavigue dès que `activeMainTab` change.

3. Corriger l’effet de lecture des query params
- Ajouter le cas `tab=inventaire` si l’effet est conservé.
- Idéalement, remplacer cet effet par une sync plus simple: si l’URL change, `activeMainTab` suit la valeur normalisée, point final.

4. Préserver les autres params sans régression
- En changeant d’onglet, conserver `semaine`.
- Ne pas casser les liens profonds existants vers `validation`.
- Vérifier que le comportement Super Admin reste identique, même sans conducteur sélectionné.

Fichiers à ajuster
- `src/pages/ValidationConducteur.tsx` : correction principale
- Aucun changement nécessaire a priori dans :
  - `src/components/conducteur/InventoryDashboard.tsx`
  - `src/components/ui/tabs.tsx`

Détails techniques
- Remplacer la logique actuelle par un schéma simple :
```text
URL tab normalisé -> state activeMainTab
clic onglet -> update state + update URL une seule fois
changement semaine -> update URL sans réécrire un tab obsolète
```
- Éviter toute logique qui “force” `validation` tant que `tab=inventaire` est déjà présent.
- Utiliser de préférence `setSearchParams` pour rester cohérent avec les autres pages comme `AdminPanel`.

Vérifications à faire après correction
- Clic simple sur "Inventaire" depuis `/validation-conducteur?tab=validation&semaine=2026-S14`
- Reload direct sur `/validation-conducteur?tab=inventaire&semaine=2026-S14`
- Aller/retour entre `Mes heures`, `Validation`, `Inventaire`
- Cas Super Admin avec et sans conducteur sélectionné
- Vérifier qu’aucun clic répété n’est nécessaire et que l’onglet reste stable

Risque de régression
- Faible si on limite le correctif à la gestion URL/onglets de `ValidationConducteur`.
- Le risque principal est de casser les anciens deep-links; il sera réduit en gardant la normalisation avec fallback vers `validation`.
