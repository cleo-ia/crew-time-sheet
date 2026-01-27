

# Correction du filtrage des utilisateurs administratifs dans le planning

## Problème identifié

Le modal "Ajouter un employé au planning" affiche des utilisateurs qui ne devraient pas y apparaître :

| Utilisateur | Rôle auth | role_metier | Affiché comme |
|-------------|-----------|-------------|---------------|
| Theo Gouin | super_admin | NULL | Maçon ❌ |
| Estelle Vermeersch | gestionnaire | NULL | Maçon ❌ |
| Clément Thomas | admin | NULL | (déjà exclu ✓) |

### Cause racine

Dans `useAllEmployes.ts`, le filtre à la ligne 26-32 n'exclut que les rôles `admin` et `rh` :

```typescript
const { data: adminRoles } = await supabase
  .from("user_roles")
  .select("user_id")
  .eq("entreprise_id", entrepriseId)
  .in("role", ["admin", "rh"]); // ← Manque: super_admin, gestionnaire, conducteur
```

Les rôles `super_admin`, `gestionnaire` et `conducteur` ne sont pas exclus, donc ces utilisateurs sont récupérés puis catégorisés comme "maçon" par le fallback de `getEmployeType`.

---

## Solution proposée

### Modification de `useAllEmployes.ts`

Étendre le filtre d'exclusion pour inclure TOUS les rôles administratifs/non-terrain :

```typescript
// Ligne 29-30 - Avant
.in("role", ["admin", "rh"]);

// Après
.in("role", ["admin", "rh", "super_admin", "gestionnaire", "conducteur"]);
```

---

## Rôles à exclure du planning

| Rôle | Raison d'exclusion |
|------|-------------------|
| `admin` | Utilisateur administrateur système |
| `rh` | Ressources humaines (bureau) |
| `super_admin` | Super administrateur (ex: Theo Gouin) |
| `gestionnaire` | Gestionnaire (ex: Estelle Vermeersch) |
| `conducteur` | Conducteur de travaux (déjà exclu par `role_metier.neq.conducteur`) |

---

## Rôles conservés dans le planning

| Rôle métier | Affichage | Utilisateurs concernés |
|-------------|-----------|----------------------|
| `chef` | Chef | Chefs d'équipe terrain |
| `macon` | Maçon | Maçons, aides, apprentis |
| `finisseur` | Finisseur | Finisseurs |
| `grutier` | Grutier | Grutiers |
| `interimaire` | Intérim | Travailleurs temporaires |

---

## Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useAllEmployes.ts` | Ajouter `super_admin`, `gestionnaire`, `conducteur` au filtre d'exclusion |

---

## Résultat attendu

Après cette correction :
- **Theo Gouin** (`super_admin`) → Ne sera plus affiché dans le modal
- **Estelle Vermeersch** (`gestionnaire`) → Ne sera plus affichée dans le modal
- Les vrais travailleurs terrain continueront d'être affichés correctement

