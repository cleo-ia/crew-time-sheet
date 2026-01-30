

# Nettoyage du doublon Jorge Martins

## Résumé des données à supprimer

Le doublon créé automatiquement lors de l'inscription avec l'email en minuscule :

| Table | ID | Contenu |
|-------|-----|---------|
| `profiles` | `fdf8b8bb-9af9-4da6-bd12-aa491b992506` | email: jorge.martins@... (sans nom/prénom) |
| `user_roles` | `6e37381c-08fd-44a1-a1b7-9f4c4f4e11ea` | rôle chef pour SDER |
| `utilisateurs` | `fdf8b8bb-9af9-4da6-bd12-aa491b992506` | email: jorge.martins@... (sans nom/prénom) |

## À conserver

La fiche RH originale avec les bonnes informations :
- **ID** : `9f1e3a0f-7f14-4521-99db-4fe6d8722374`
- **Nom** : MARTINS DOMINGUES Jorge
- **Email** : Jorge.martins@groupe-engo.com (J majuscule)
- **Rôle métier** : chef

## Migration SQL

```sql
-- 1. Supprimer le rôle associé au doublon
DELETE FROM public.user_roles
WHERE user_id = 'fdf8b8bb-9af9-4da6-bd12-aa491b992506';

-- 2. Supprimer le profile doublon
DELETE FROM public.profiles
WHERE id = 'fdf8b8bb-9af9-4da6-bd12-aa491b992506';

-- 3. Supprimer l'entrée utilisateur doublon
DELETE FROM public.utilisateurs
WHERE id = 'fdf8b8bb-9af9-4da6-bd12-aa491b992506';
```

## Note importante

L'invitation a déjà été purgée précédemment - aucune action nécessaire sur la table `invitations`.

## Après la suppression

Jorge MARTINS DOMINGUES devra recevoir une **nouvelle invitation** pour pouvoir s'inscrire, cette fois le système :
1. Trouvera bien sa fiche RH existante (grâce à la correction case-insensitive)
2. Associera le compte auth à cette fiche
3. Aucun doublon ne sera créé

