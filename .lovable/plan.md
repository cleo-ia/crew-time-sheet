

## Améliorer le visuel du popup "absences non justifiées"

### Problème
Le toast d'erreur affiche un long texte brut avec les noms séparés par des virgules — difficile à lire quand il y a 10+ salariés.

### Ce qui change
On remplace le texte brut par un toast structuré avec :
- **Titre** : "Impossible d'exporter"
- **Description JSX** : nombre de salariés, puis liste à puces des noms (chacun sur sa propre ligne), puis message "Veuillez qualifier..."
- Durée et comportement identiques

Sonner supporte nativement le JSX dans `description`, donc pas besoin de composant custom.

### Fichier modifié
`src/pages/ConsultationRH.tsx` — 2 endroits (export RH complet + export chefs)

### Détail des modifications

**Toast export complet (ligne ~129)** : remplacer le `toast.error(string)` par :
```tsx
toast.error("Impossible d'exporter", {
  description: (
    <div className="mt-1 text-sm">
      <p>{nbEmployes} salarié(s) ont des absences non justifiées :</p>
      <ul className="mt-2 list-disc pl-4 space-y-0.5 max-h-40 overflow-y-auto">
        {employesAvecAbsencesNonQualifiees.map((e, i) => (
          <li key={i}>{e.prenom} {e.nom}</li>
        ))}
      </ul>
      <p className="mt-2 font-medium">Veuillez qualifier toutes les absences avant l'export.</p>
    </div>
  ),
  duration: 8000,
});
```

**Toast export chefs (ligne ~192)** : même transformation adaptée au message "Chefs concernés".

**Bonus** — `src/components/rh/InterimaireExportDialog.tsx` (ligne ~263) : même mise en forme pour la cohérence.

### Impact
- Même contenu, meilleure lisibilité
- Liste scrollable si beaucoup de noms
- Aucun changement de logique métier

