

# Bandeau d'information chef multi-chantier (toujours visible)

## Objectif

Afficher un bandeau informatif bleu sur la page de saisie hebdomadaire **des qu'un chef est affecte a plusieurs chantiers**, quel que soit le chantier actuellement selectionne (principal ou secondaire). Le bandeau rappelle les regles de repartition des heures, paniers et trajets entre chantiers.

## Emplacement

Juste apres la Card de selection (chef/semaine/chantier) et avant l'alerte "vendredi 12h", au meme niveau que les autres alertes existantes (ligne 526 environ).

## Condition d'affichage

Le bandeau s'affiche si et seulement si :
- Un chef et un chantier sont selectionnes
- Le chef a **plusieurs chantiers** affectes pour la semaine en cours (multi-chantier)

Pour les chefs mono-chantier, aucun bandeau ne s'affiche (pas de surcharge inutile).

## Design

- Composant `Alert` existant avec style bleu : `border-blue-500/50 bg-blue-500/10`
- Icone `Info` de lucide-react
- Texte concis en 3-4 lignes

## Texte du bandeau

> **Chef multi-chantier** -- Vos heures sont a 0 par defaut sur le chantier secondaire. Si vous saisissez des heures sur un chantier, pensez a ajuster l'autre en consequence. Exemple : 4h ici = reduisez a 4h sur l'autre chantier. Meme principe pour les paniers et trajets : ne les cochez que sur un seul chantier par jour.

## Modification technique : src/pages/Index.tsx

1. **Ajouter une query** pour recuperer le nombre de chantiers du chef sur la semaine (via `ChantierSelector` ou une query directe sur les chantiers affectes). On peut reutiliser la logique existante du `ChantierSelector` qui liste deja les chantiers du chef, ou ajouter une petite query qui compte les chantiers.

2. **Calculer `isChefMultiChantier`** : `true` si le chef a 2+ chantiers pour cette semaine.

3. **Ajouter le bandeau** conditionnel entre la Card de selection (ligne 524) et l'alerte vendredi (ligne 526).

## Zero impact

- Purement informatif, aucun blocage
- Aucun changement de logique metier
- Ne s'affiche pas pour les chefs mono-chantier

