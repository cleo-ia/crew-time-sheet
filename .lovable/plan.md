

## Plan : 3 règles de verrouillage temporel — IMPLÉMENTÉ ✅

### Règle 1 — Planning verrouillé le vendredi (semaine courante)
- `isPlanningLocked` dans `PlanningMainOeuvre.tsx` : désactive boutons Valider, Modifier, Synchroniser, Copier S-1
- Accordions en read-only (onDayToggle, onRemoveEmploye, onAddEmploye, onVehiculeChange, onSetChefResponsable passés à undefined)
- Bandeau jaune d'avertissement affiché

### Règle 2 — Transmission S bloquée avant vendredi (chefs)
- Déjà implémenté via `contrainteVendredi12h` dans `Index.tsx` (flag temporairement désactivé pour LR)

### Règle 3 — Transmission S bloquée avant vendredi (conducteurs + finisseurs)
- `ValidationConducteur.tsx` : vérification ajoutée dans `handleSaveAndSign`
- `SignatureFinisseurs.tsx` : vérification ajoutée dans `handleSubmit`
- Utilise le feature flag `contrainteVendredi12h` existant

### Nouvelle utilitaire
- `isFridayOrWeekendParis()` ajoutée dans `src/lib/date.ts`

### Activation
- Règle 1 (planning) : active pour toutes les entreprises
- Règles 2+3 (transmission) : conditionnées au flag `contrainteVendredi12h` (à réactiver dans config entreprise)
