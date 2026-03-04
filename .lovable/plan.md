

# Plan : Notification email aux conducteurs passifs après sync planning

## Contexte

Après la synchronisation planning du lundi, Fabrice (conducteur du chantier 2CB) et Osman (conducteur du chantier PAM) doivent recevoir un email s'il y a des affectations sur leur chantier respectif cette semaine.

**Données existantes :**
- Chantier `CX2CB` (nom: 2CB-Atelier) → `conducteur_id` = Fabrice (`f6e2fade-...`)
- Chantier `CXPAM` (nom: PAM) → `conducteur_id` = Osman (`7be27e87-...`)
- Fabrice : `fabrice.froment@groupe-engo.com`
- Osman : `osman.yagci@groupe-engo.com`
- Le secret `RESEND_API_KEY` est deja configure.

## Modification

**Fichier unique a modifier : `supabase/functions/sync-planning-to-teams/index.ts`**

A la fin du handler principal (apres la boucle de sync par entreprise, vers la ligne 158), ajouter une etape de notification :

1. Definir une liste de "conducteurs passifs" avec leur `conducteur_id` et `code_chantier` associe (hardcode, comme demande)
2. Pour chaque conducteur passif, verifier s'il y a eu des affectations creees/copiees sur leur chantier pendant la sync (en regardant les `allResults` ou en faisant un simple `SELECT` sur `planning_affectations` pour la semaine courante et le `chantier_id` correspondant)
3. Si oui, envoyer un email via Resend avec un recapitulatif simple : "Vous avez des affectations sur votre chantier [NOM] cette semaine [SEMAINE]" avec la liste des employes affectes
4. Utiliser le template email existant (`generateEmailHtml` de `_shared/emailTemplate.ts`) pour garder le meme style

## Detail technique

```text
Apres la boucle sync (ligne ~158):
  
  CONDUCTEURS_PASSIFS = [
    { conducteurId: "f6e2fade-...", chantierId: "b68eac6d-...", chantierNom: "2CB-Atelier" },
    { conducteurId: "7be27e87-...", chantierId: "5e9f9798-...", chantierNom: "PAM" }
  ]

  Pour chaque conducteur passif:
    1. SELECT planning_affectations + employe info WHERE chantier_id = X AND semaine = currentWeek
    2. Si count > 0 :
       - Recuperer email/prenom du conducteur depuis utilisateurs
       - Construire le HTML avec la liste des employes affectes
       - Envoyer via Resend
       - Logger dans la console
```

L'email contiendra : le nom du chantier, la semaine, et la liste des employes affectes avec leurs jours.

