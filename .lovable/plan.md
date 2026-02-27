

## Plan : Page Rapprochement Intérimaires (SDER)

### Résumé

Créer la page `/rapprochement-interim` accessible uniquement pour SDER. Aucun bouton ajouté dans le header. Le super_admin y accède via le sélecteur de routes Lovable (dropdown en haut à gauche de l'IDE). Carole (gestionnaire) y accède via sa nav isolée.

### Étapes

1. **Créer `src/pages/RapprochementInterim.tsx`**
   - Page avec `AppNav` + `PageHeader` "Rapprochement Intérimaires"
   - Filtres : mois (sélecteur période), agence (`AgenceInterimCombobox`), recherche nom
   - Tableau consolidé des intérimaires (réutilise `buildRHConsolidation` avec `typeSalarie: 'interim'`) : nom, agence, chantiers, heures normales, heures sup 25/50, absences, paniers, trajets
   - Dialog détail jour par jour au clic sur un salarié
   - Boutons "Nouvel intérimaire" et "Modifier" via `InterimaireFormDialog`

2. **Ajouter la route dans `App.tsx`**
   - Route `/rapprochement-interim` avec `RequireRole allowedRoles={["super_admin", "gestionnaire"]}`
   - Pas de redirection, pas de garde entreprise supplémentaire (la page n'existe que pour SDER)

3. **Adapter `AppNav.tsx`**
   - Pour le rôle `gestionnaire` : nav isolée avec uniquement "Rapprochement Intérim" + "Aide" + "Déconnexion"
   - Aucun nouveau bouton pour les autres rôles (super_admin, chef, conducteur, rh, admin)

4. **Adapter `RequireRole.tsx`**
   - Redirection par défaut du rôle `gestionnaire` vers `/rapprochement-interim`

### Détails techniques

- `buildRHConsolidation` de `rhShared.ts` accepte déjà le filtre `typeSalarie: 'interim'`, réutilisation directe
- `InterimaireFormDialog` existant réutilisé tel quel pour créer/modifier
- Le super_admin accède à la page via le sélecteur de routes Lovable (capture d'écran fournie), aucune modification du header nécessaire
- La restriction SDER est implicite : seuls les utilisateurs SDER avec rôle `gestionnaire` ou `super_admin` y accèdent, et les données sont filtrées par `entreprise_id` via les hooks existants

