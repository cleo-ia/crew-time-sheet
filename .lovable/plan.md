

# Fiches de trajet optionnelles pour SDER (conducteur uniquement)

## Contexte
Jorge (conducteur SDER) ne peut pas transmettre ses fiches au RH car le systeme bloque tant que les fiches de trajet ne sont pas remplies. Ce blocage doit etre leve uniquement pour SDER.

## Approche
Lire `localStorage.getItem("entreprise_slug")` aux 2 points de blocage et bypasser la verification si le slug est `"sder"`. Aucun nouveau flag, aucun nouveau fichier.

## Modifications (2 fichiers, ~5 lignes modifiees au total)

### 1. `src/pages/ValidationConducteur.tsx` (ligne 395-407)

Entourer le bloc de verification transport avec une condition sur le slug :

```text
const slug = localStorage.getItem("entreprise_slug");
if (slug !== "sder") {
  const { ok, errors } = await checkAllFinisseursTransportComplete();
  if (!ok) {
    setIsSubmitting(false);
    toast({ ... });
    return;
  }
}
```

Pour SDER, on saute directement a la signature. Pour les autres entreprises, le comportement reste strictement identique.

### 2. `src/components/validation/FicheDetail.tsx` (ligne 102)

Remplacer :
```text
const isTransportValidForSignature = shouldCheckTransport ? isTransportComplete : true;
```

Par :
```text
const entrepriseSlug = localStorage.getItem("entreprise_slug");
const isTransportValidForSignature = entrepriseSlug === "sder" ? true : (shouldCheckTransport ? isTransportComplete : true);
```

Pour SDER, la validation transport est toujours consideree comme valide. Pour les autres entreprises, la logique existante est inchangee.

## Garantie zero regression

- **Limoge Revillon** (`limoge-revillon`) : le slug ne matche pas `"sder"`, tout le code de verification transport s'execute normalement, aucun changement
- **Engo Bourgogne** (`engo-bourgogne`) : idem, aucun impact
- **SDER** : seul le blocage transport est leve, tout le reste (saisie heures, signatures, validation chef) fonctionne normalement
- L'onglet "Fiche de trajet" reste visible et utilisable pour SDER, il n'est simplement plus bloquant

## Fichiers modifies
- `src/pages/ValidationConducteur.tsx` : ajout de 2 lignes (condition sur slug)
- `src/components/validation/FicheDetail.tsx` : modification de 1 ligne (ajout condition slug)

