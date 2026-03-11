

## Plan : Refaire le dialog de détail absence longue durée dans le style "papier" du dialog congés

### Contexte

Le dialog de détail des absences longue durée (ALD) affiché depuis le planning est actuellement un simple listing de champs. On veut le mettre au même niveau visuel que le `DemandeCongeDetailDialog` : fond papier, logo entreprise, titre en majuscules, champs avec bordures, checkboxes visuelles pour le type, dates formatées.

### Modification

**Fichier : `src/pages/PlanningMainOeuvre.tsx` (lignes 840-879)**

Remplacer le dialog inline basique par un nouveau composant dédié `AbsenceLDDetailDialog`.

**Nouveau fichier : `src/components/conges/AbsenceLDDetailDialog.tsx`**

Créer un composant reprenant le même style visuel que `DemandeCongeDetailDialog` :
- Fond `bg-[#fafaf8]`, logo entreprise via `useEnterpriseConfig()`
- Titre "ABSENCE LONGUE DURÉE" en majuscules avec nom entreprise
- Section salarié : NOM / Prénom avec bordures façon formulaire papier
- Section type d'absence : grille de checkboxes visuelles (ReadOnlyCheckbox) listant les 6 types (AT, AM, MP, Congé parental, Contrat arrêté, Contrat non débuté)
- Section dates : Du / Au avec le même style que le dialog congés, "Indéterminée" si pas de date de fin
- Section motif (si renseigné) : encadré avec fond léger
- Pas de section signature ni statut (les ALD n'en ont pas)

**Props du composant :**
```typescript
interface AbsenceLDDetailDialogProps {
  absence: {
    id: string;
    type_absence: string;
    date_debut: string;
    date_fin: string | null;
    motif: string | null;
    salarie_nom: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Dans `PlanningMainOeuvre.tsx` :** remplacer le bloc Dialog inline (lignes 840-879) par `<AbsenceLDDetailDialog absence={selectedAbsenceLD} open={!!selectedAbsenceLD} onOpenChange={...} />`.

### Résultat

Le dialog ALD aura le même look "formulaire papier" que les demandes de congé, avec logo, checkboxes visuelles et mise en forme cohérente.

