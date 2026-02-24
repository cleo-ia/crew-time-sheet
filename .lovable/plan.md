

# Simplifier le badge multi-chef : un seul badge "Saisie" avec etat actif/inactif

## Concept

Chaque chef sur un chantier affiche un badge **"Saisie"** :
- **Grise** : ce chef n'est pas en charge de la saisie
- **Bleu** (avec icone Crown) : ce chef gere la saisie des heures de l'equipe

Un clic sur un badge grise le passe en bleu et desactive l'ancien.

## Modification

**Fichier unique** : `src/components/planning/PlanningEmployeRow.tsx`

### Changements dans le badge multi-chef (section `showChefResponsable`)

1. **Label** : remplacer "Responsable" et "Secondaire" par **"Saisie"** dans les deux cas
2. **Style** : conserver le style actuel (bleu = actif, grise = inactif) -- deja en place
3. **Icone** : garder l'icone `Crown` uniquement sur le badge bleu (actif)
4. **Tooltips** :
   - Badge bleu : "Ce chef gere la saisie des heures de l'equipe sur ce chantier."
   - Badge grise : "Cliquer pour donner la main sur la saisie a ce chef."

### Ce qui ne change pas

- Les badges "Principal" / "Secondaire" (multi-site, comptage heures) restent identiques
- La logique de bascule (`onSetChefResponsable`) reste identique
- Les styles (couleurs, tailles) restent identiques

C'est un changement de 2 lignes de texte et 2 lignes de tooltip dans le JSX.

