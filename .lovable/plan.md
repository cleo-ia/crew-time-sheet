

# Plan : Page "Codes Trajet par défaut" — V1 standalone

## Résumé

Nouvelle page `/codes-trajet` isolée, avec sa propre table Supabase et une requête dédiée pour les employés. Zéro impact sur le reste de l'app.

## Pourquoi c'est 100% safe

- **Nouvelle table dédiée** `codes_trajet_defaut` : aucune colonne ajoutée aux tables existantes, aucun trigger ajouté sur les tables existantes.
- **Requête employés dédiée** : une nouvelle requête Supabase directe dans le hook de la page, qui ne touche pas `useAllEmployes` ni aucun hook existant. Aucun cache partagé.
- **Aucune communication** avec le flux de saisie, validation, ou RH. La table est lue/écrite uniquement depuis cette page.
- **V2 (plus tard)** : le pré-remplissage se fera au moment du passage en statut `ENVOYE_RH` — noté.

## Étapes

### 1. Migration Supabase — table `codes_trajet_defaut`

```sql
CREATE TABLE public.codes_trajet_defaut (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid NOT NULL,
  chantier_id uuid NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  salarie_id uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  code_trajet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entreprise_id, chantier_id, salarie_id)
);

ALTER TABLE public.codes_trajet_defaut ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access codes_trajet_defaut of their company"
  ON public.codes_trajet_defaut FOR ALL TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

CREATE TRIGGER update_codes_trajet_defaut_updated_at
  BEFORE UPDATE ON public.codes_trajet_defaut
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Hook dédié `src/hooks/useCodesTrajetDefaut.ts`

- **Query employés terrain** : requête dédiée sur `utilisateurs` filtrée `role_metier IN ('chef','macon','grutier','finisseur')` + `entreprise_id`. Complètement indépendante de `useAllEmployes`. Query key unique : `["codes-trajet-employes"]`.
- **Query mappings** : fetch tous les `codes_trajet_defaut` de l'entreprise, indexés en `Map<"chantierId_salarieId", code_trajet>` pour lookup O(1). Query key : `["codes-trajet-defaut"]`.
- **Mutation upsert** : `upsert` sur la contrainte unique, invalide uniquement `["codes-trajet-defaut"]`. Toast succès/erreur.

### 3. Page `src/pages/CodesTrajet.tsx`

- `AppNav` + `PageLayout` + `PageHeader` ("Codes trajet par défaut")
- Barre de recherche pour filtrer les chantiers par nom/code
- Pour chaque **chantier actif** (`useChantiers()`) : un `Accordion`
- Dans chaque accordion : tableau `Employé | Rôle | Code trajet`
  - Employés chargés **une seule fois**, partagés entre tous les accordions
  - Le `Select` de code trajet utilise les options existantes de `CODE_TRAJET_OPTIONS` (sans "AUCUN" ni "A_COMPLETER")
  - Sauvegarde immédiate via upsert au changement
- Badge coloré par rôle (réutilisation de `EMPLOYE_TYPE_COLORS` existant)

### 4. Route `App.tsx`

```tsx
<Route path="/codes-trajet" element={
  <RequireRole allowedRoles={["super_admin", "rh", "admin"]}>
    <CodesTrajet />
  </RequireRole>
} />
```

### 5. Navigation `AppNav.tsx`

Nouveau lien "Codes trajet" visible pour `rh`, `admin`, `super_admin`, placé entre "Export Paie" et "Administration", avec le style `consultation-rh` (même couleur que les pages RH).

## Fichiers créés/modifiés

| Fichier | Action |
|---------|--------|
| Migration SQL | Création table + RLS |
| `src/hooks/useCodesTrajetDefaut.ts` | Nouveau — requête dédiée employés + mappings + mutation |
| `src/pages/CodesTrajet.tsx` | Nouveau — page complète |
| `src/App.tsx` | Route ajoutée |
| `src/components/navigation/AppNav.tsx` | Lien nav ajouté |

