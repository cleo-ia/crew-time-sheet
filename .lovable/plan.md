

# Contrainte UNIQUE anti-doublons sur `utilisateurs`

## Objectif
Ajouter une contrainte UNIQUE en base sur `(LOWER(nom), LOWER(prenom), entreprise_id)` pour que PostgreSQL refuse tout doublon, indépendamment du front.

## Étapes

### 1. Vérifier les doublons existants
Avant d'ajouter la contrainte, exécuter une requête de détection pour s'assurer qu'aucun doublon ne bloque la migration.

### 2. Créer la migration SQL
Ajouter un **unique index** (plutôt qu'une simple contrainte) sur `LOWER(nom), LOWER(prenom), entreprise_id` pour gérer la casse :

```sql
CREATE UNIQUE INDEX idx_utilisateurs_nom_prenom_entreprise 
ON utilisateurs (LOWER(nom), LOWER(prenom), entreprise_id);
```

Cela empêchera d'insérer "chetail / david" si "Chetail / David" existe déjà pour la même entreprise.

### 3. Adapter le hook `useCreateUtilisateur`
Ajouter un `catch` qui détecte l'erreur PostgreSQL `23505` (unique_violation) et affiche un message clair : *"Un employé avec ce nom et prénom existe déjà."*

La vérification JavaScript existante reste en place comme garde rapide, mais la base de données a le dernier mot.

## Impact
- Aucune modification de structure des tables existantes
- Aucun impact sur les données actuelles (plus de doublons après le nettoyage de Chetail)
- Protection définitive côté serveur

