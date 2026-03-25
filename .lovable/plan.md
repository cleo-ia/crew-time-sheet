

# Séparer le bouton Planning S+1 par rôle dans la navigation

## Problème
Actuellement, le bouton "Planning S+1" est affiché dans un bloc commun (`canSeePlanning`) avec le thème orange `validation-conducteur`. Pour Tanguy (RH), ce bouton apparaît au milieu des boutons conducteur qu'il ne devrait pas voir. Il faut que le bouton Planning apparaisse uniquement dans la section correspondant au rôle de l'utilisateur.

## Modification — `src/components/navigation/AppNav.tsx`

**a) Supprimer `"rh"` de `canSeePlanning`** — revenir à :
```typescript
const canSeePlanning = userRole && ["super_admin", "conducteur", "admin"].includes(userRole);
```

**b) Ajouter un bouton Planning S+1 dédié dans la section RH** — juste avant ou après "Consultation RH" (L215), conditionné par `canSeeRH` :
```typescript
{canSeeRH && (
  <Button asChild variant="ghost" size="sm"
    className={getButtonClasses("/planning-main-oeuvre", "consultation-rh")}
    style={getButtonStyle("/planning-main-oeuvre", "consultation-rh")}>
    <Link to="/planning-main-oeuvre">
      <CalendarDays className="h-4 w-4" />
      Planning S+1
    </Link>
  </Button>
)}
```

Ainsi :
- **Conducteurs/admins** : voient le bouton Planning en orange dans leur section (inchangé)
- **RH** : voit le bouton Planning en vert dans sa section, au même niveau que Consultation RH / Export Paie / Codes trajet
- **Aucun doublon** pour `super_admin` car `canSeePlanning` et `canSeeRH` ne se chevauchent pas pour RH

Aucune autre modification nécessaire — la route et le mode lecture seule sont déjà en place.

