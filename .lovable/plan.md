
# Plan de Correction : Fiche de Trajet Conducteur SDER

## Diagnostic confirmé

Après analyse du code, j'ai identifié **deux problèmes distincts** qui se combinent :

---

## Problème 1 : Les menus ne s'ouvrent pas (UI bloquée)

**Fichier** : `src/pages/ValidationConducteur.tsx` (lignes 64-68)

**Cause** : Le wrapper `TransportSheetWithFiche` appelle `useFicheId()` à l'intérieur. Pendant le chargement :
1. `ficheId` = `undefined`
2. Puis `ficheId` = la vraie valeur

Ce changement provoque un **re-render complet** de `TransportSheetV2`, ce qui ferme instantanément tout Popover qui vient de s'ouvrir.

**Pourquoi ça fonctionne côté Chef** : Dans `Index.tsx`, `useFicheId()` est appelé au niveau du composant parent (ligne 234), donc `ficheId` est déjà stable quand `TransportSheetV2` se monte.

**Solution** : Ajouter un guard de chargement dans `TransportSheetWithFiche`

```typescript
// AVANT (ligne 49-82)
const TransportSheetWithFiche = ({ ... }) => {
  const { data: ficheId } = useFicheId(...);
  return <TransportSheetV2 ficheId={ficheId} ... />;
};

// APRÈS
const TransportSheetWithFiche = ({ ... }) => {
  const { data: ficheId, isLoading } = useFicheId(...);
  
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            Chargement de la fiche de trajet...
          </span>
        </div>
      </Card>
    );
  }
  
  return <TransportSheetV2 ficheId={ficheId} ... />;
};
```

---

## Problème 2 : Liste des conducteurs vide (données manquantes)

**Fichier** : `src/components/transport/TransportDayAccordion.tsx` (ligne 101)

**Cause** : Les données `ficheJours` ne sont pas passées aux finisseurs

```typescript
// PROBLÈME (ligne 95-103)
const finisseursAsMacons = useMemo(() => {
  if (mode !== "conducteur") return [];
  return finisseursEquipe.map(f => ({
    id: f.id,
    nom: f.nom,
    prenom: f.prenom,
    ficheJours: [] as any[],  // ← VIDE - le ConducteurCombobox ne peut pas vérifier les statuts
  }));
}, [mode, finisseursEquipe]);
```

**Solution en 2 parties** :

### Partie A : Enrichir les données dans ValidationConducteur.tsx

```typescript
// AVANT (ligne 807-811)
finisseursEquipe={chantierFinisseurs.map(f => ({
  id: f.id,
  nom: f.nom,
  prenom: f.prenom
}))}

// APRÈS
finisseursEquipe={chantierFinisseurs.map(f => ({
  id: f.id,
  nom: f.nom,
  prenom: f.prenom,
  ficheJours: f.ficheJours || []
}))}
```

### Partie B : Mettre à jour l'interface et utiliser les données

**Fichiers** : `TransportSheetV2.tsx`, `TransportDayAccordion.tsx`, `ValidationConducteur.tsx`

```typescript
// Nouvelle interface FinisseurEquipe
interface FinisseurEquipe {
  id: string;
  nom: string;
  prenom: string;
  ficheJours?: Array<{
    date: string;
    heures?: number;
    trajet_perso?: boolean;
    code_trajet?: string | null;
  }>;
}
```

### Partie C : Utiliser les vraies données dans TransportDayAccordion

```typescript
// AVANT (ligne 101)
ficheJours: [] as any[],

// APRÈS
ficheJours: f.ficheJours || [],
```

---

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/ValidationConducteur.tsx` | Guard de chargement + enrichir `finisseursEquipe` |
| `src/components/transport/TransportSheetV2.tsx` | Mettre à jour interface `FinisseurEquipe` |
| `src/components/transport/TransportDayAccordion.tsx` | Mettre à jour interface + utiliser `f.ficheJours` |

---

## Risque de régression

**Très faible** car :
- Le mode Chef n'est pas impacté (n'utilise pas `TransportSheetWithFiche`)
- Les modifications sont additives (ajout de données, pas de suppression)
- Le guard de chargement n'affecte que l'affichage initial

---

## Résultat attendu

Après correction :
1. Les menus Immatriculation s'ouvriront au clic
2. Les menus Conducteur Matin/Soir s'ouvriront au clic
3. Les 14 employés de l'équipe seront visibles dans les listes
4. Les règles de validation (trajet perso, absent, etc.) fonctionneront
