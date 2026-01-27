
# Correction du role_metier manquant et amélioration du trigger

## Contexte

L'analyse révèle 17 utilisateurs sans `role_metier` défini dans l'entreprise Limoge-Revillon :

| Utilisateur | Email | app_role | Action requise |
|-------------|-------|----------|----------------|
| Giovanni DORAZIO | giovanni.dorazio@groupe-engo.com | chef | role_metier → 'chef' |
| Chloé CATHERIN | chloe.catherin@groupe-engo.com | conducteur | role_metier → 'conducteur' |
| Julien DA COSTA | julien.dacosta@groupe-engo.com | conducteur | role_metier → 'conducteur' |
| Sébastien FROMONT | sebastien.fromont@groupe-engo.com | conducteur | role_metier → 'conducteur' |
| Monem Saidi | - | - | role_metier → 'finisseur' |
| Mikail Zali | - | - | role_metier → 'finisseur' |
| Yusuf Zali | - | - | role_metier → 'finisseur' |
| Yusuf Coskun | - | - | role_metier → 'finisseur' |
| Mustafa Bentouhami | - | - | role_metier → 'finisseur' |
| Ahmed Bhagdadi | - | - | role_metier → 'finisseur' |
| David Chetail | - | - | role_metier → 'finisseur' |
| Théo Gouin | theo.gouin@groupe-engo.com | super_admin | Pas de role_metier (admin) |
| Clément THOMAS | clement.thomas@groupe-engo.com | admin | Pas de role_metier (admin) |
| Tanguy Gabillet | tanguy.gabillet@groupe-engo.com | rh | Pas de role_metier (RH) |
| Clara Guilloux | clara.guilloux@groupe-engo.com | rh | Pas de role_metier (RH) |
| Estelle VERMEERSCH | estelle.vermeersch@groupe-engo.com | gestionnaire | Pas de role_metier (gestion) |
| (sans nom) | comptaengobo@groupe-engo.com | rh | Pas de role_metier (RH) |

## Modifications à effectuer

### 1. Nettoyage des données existantes (Migration SQL)

Mise à jour du `role_metier` pour les utilisateurs terrain :

```sql
-- Chefs avec app_role 'chef'
UPDATE utilisateurs SET role_metier = 'chef' 
WHERE auth_user_id IN (
  SELECT user_id FROM user_roles WHERE role = 'chef'
) AND role_metier IS NULL;

-- Conducteurs avec app_role 'conducteur'  
UPDATE utilisateurs SET role_metier = 'conducteur'
WHERE auth_user_id IN (
  SELECT user_id FROM user_roles WHERE role = 'conducteur'
) AND role_metier IS NULL;

-- Utilisateurs sans email ni role → finisseurs par défaut
UPDATE utilisateurs SET role_metier = 'finisseur'
WHERE role_metier IS NULL 
  AND (agence_interim IS NULL OR agence_interim = '')
  AND email IS NULL
  AND auth_user_id IS NULL;
```

### 2. Amélioration du trigger handle_new_user_signup

Modification du trigger PostgreSQL pour définir automatiquement le `role_metier` selon le rôle de l'invitation :

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record record;
  user_email text;
  existing_utilisateur_id uuid;
  invitation_entreprise_id uuid;
  mapped_role_metier text;
BEGIN
  -- ... code existant pour vérification email et invitation ...

  -- NOUVEAU: Mapper le rôle d'invitation vers role_metier
  mapped_role_metier := CASE invitation_record.role
    WHEN 'chef' THEN 'chef'
    WHEN 'conducteur' THEN 'conducteur'
    WHEN 'macon' THEN 'macon'
    WHEN 'finisseur' THEN 'finisseur'
    WHEN 'grutier' THEN 'grutier'
    ELSE NULL  -- admin, rh, gestionnaire → pas de role_metier
  END;

  -- Mise à jour ou création avec role_metier
  IF existing_utilisateur_id IS NOT NULL THEN
    UPDATE public.utilisateurs
    SET auth_user_id = NEW.id,
        entreprise_id = invitation_entreprise_id,
        role_metier = COALESCE(role_metier, mapped_role_metier),
        updated_at = now()
    WHERE id = existing_utilisateur_id;
  ELSE
    INSERT INTO public.utilisateurs (...)
    VALUES (..., mapped_role_metier, ...);
  END IF;

  -- ... reste du code ...
END;
$function$
```

### 3. Amélioration de l'affichage dans UsersManager

Modification de la fonction `getRoleForUser` pour ne pas afficher "finisseur" par défaut quand le rôle est vraiment inconnu :

```typescript
const getRoleForUser = (utilisateur: any) => {
  // 1. Si compte auth → chercher dans user_roles
  if (utilisateur.auth_user_id) {
    const userRole = userRoles?.find((r) => r.user_id === utilisateur.auth_user_id);
    if (userRole) return userRole.role;
  }
  
  // 2. Vérifier role_metier
  if (utilisateur.role_metier) return utilisateur.role_metier;
  
  // 3. Intérimaire
  if (utilisateur.agence_interim) return "interimaire";
  
  // 4. Inconnu - afficher comme "non défini" au lieu de finisseur
  return "non_defini";
};
```

## Résultat attendu

1. Les 7 utilisateurs terrain sans email auront `role_metier = 'finisseur'`
2. Les 4 utilisateurs avec app_role chef/conducteur auront le `role_metier` correspondant
3. Les 6 utilisateurs admin/RH/gestionnaire n'auront pas de `role_metier` (normal)
4. Les futurs utilisateurs invités auront automatiquement leur `role_metier` défini
5. L'affichage dans l'onglet Utilisateurs sera cohérent avec les onglets métier

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Nettoyage données + mise à jour trigger |
| src/components/admin/UsersManager.tsx | Amélioration getRoleForUser |
