

# Ajout des types d'absence manquants dans la base de donnees

## Le probleme en simple

Quand vous selectionnez "Contrat non debute" dans le menu deroulant des absences, l'application envoie la valeur `CONTRAT_NON_DEBUTE` a la base de donnees. Mais cette valeur n'existe pas dans la liste autorisee par la base -- d'ou l'erreur "invalid input value".

C'est comme essayer de mettre une couleur qui n'existe pas dans une palette predéfinie.

## La solution

Ajouter les 2 valeurs manquantes (`CONTRAT_ARRETE` et `CONTRAT_NON_DEBUTE`) a l'enum `type_absence` dans la base de donnees via une migration SQL.

## Detail technique

**Fichier** : nouvelle migration SQL

```sql
ALTER TYPE public.type_absence ADD VALUE IF NOT EXISTS 'CONTRAT_ARRETE';
ALTER TYPE public.type_absence ADD VALUE IF NOT EXISTS 'CONTRAT_NON_DEBUTE';
```

Aucune modification de code n'est necessaire -- le menu deroulant dans `EditableAbsenceTypeCell.tsx` propose deja ces valeurs. Seule la base de donnees doit etre mise a jour.

**Apres la migration** : il faudra **publier** le projet pour que le changement s'applique aussi en production.

