
# Fiches de Transport Matériaux (Dépôt → Chantiers)

## Résumé de la demande

Créer un module permettant aux **conducteurs** de :
1. Renseigner une fiche de demande de matériaux/matériels pour un chantier
2. Générer un **export Excel** formaté (comme l'image fournie)
3. **Envoyer par email** cette fiche au responsable du dépôt (personne externe à l'application)

---

## Architecture proposée

### 1. Nouvelle table en base de données

**Table : `fiches_transport_materiaux`**

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Clé primaire |
| entreprise_id | uuid | Entreprise (multi-tenant) |
| chantier_id | uuid | Chantier concerné |
| conducteur_id | uuid | Conducteur qui crée la fiche |
| semaine_livraison | integer | Numéro de semaine de livraison |
| jour_livraison | date | Date exacte de livraison souhaitée |
| moyen_transport | text | "Camion grue" / "Semi" / "Autre" |
| responsable_depot | text | Nom de la personne au dépôt (ex: Fabrice) |
| statut | text | "BROUILLON" / "TRANSMISE" |
| transmise_at | timestamp | Date d'envoi au dépôt |
| created_at | timestamp | Date de création |
| updated_at | timestamp | Date de modification |

**Table : `fiches_transport_materiaux_lignes`**

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Clé primaire |
| fiche_id | uuid | FK vers fiche parent |
| categorie | text | "Matériel" / "PAM" / autre |
| designation | text | Description de l'article |
| unite | text | "U", "m", "kg", etc. |
| quantite | numeric | Quantité demandée |
| reel_charge | numeric | Quantité réellement chargée (optionnel) |
| entreprise_id | uuid | Multi-tenant |

### 2. Email du dépôt par entreprise

**Modification table `entreprises`** :

| Colonne ajoutée | Type | Description |
|-----------------|------|-------------|
| email_depot | text | Email du responsable du dépôt (ex: depot@groupe-engo.com) |

---

## Interface utilisateur

### Emplacement : Page ValidationConducteur (onglet "Mes heures")

Ajout d'un **nouveau bouton** dans la section des actions du conducteur :

```
┌─────────────────────────────────────────────────────────────────┐
│  [📦 Demande transport matériaux]   ← Nouveau bouton           │
└─────────────────────────────────────────────────────────────────┘
```

### Composant : `TransportMateriauxSheet`

Un **drawer** (Sheet) qui s'ouvre depuis le bouton, contenant :

**Section 1 - Informations générales**
- Sélection du chantier (auto-rempli avec infos chef, ville, adresse)
- Semaine de livraison (numéro)
- Jour de livraison (calendrier)
- Moyen de transport (select : Camion grue / Semi / Autre)
- Responsable dépôt (texte libre, ex: "Fabrice")

**Section 2 - Liste des matériaux**
- Tableau éditable avec bouton "Ajouter une ligne"
- Colonnes : Catégorie | Désignation | Unité | Quantité

**Section 3 - Actions**
- Bouton "Enregistrer brouillon"
- Bouton "Transmettre au dépôt" → Génère Excel + Envoie email

---

## Edge Function : `send-transport-materiaux`

**Fonctionnalités :**
1. Récupérer les données de la fiche depuis la base
2. Générer un fichier Excel formaté (comme l'image fournie)
3. Envoyer par email via Resend avec le fichier en pièce jointe
4. Marquer la fiche comme "TRANSMISE"

**Format Excel généré :**
- En-tête avec logo entreprise
- Infos conducteur, chantier, chef, ville, adresse
- Semaine et jour de livraison
- Tableau des matériaux avec colonnes : Désignation | Unité | Quantité | Réel chargé
- Séparation par catégories (Matériel, PAM, etc.)

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/conducteur/TransportMateriauxButton.tsx` | Bouton + Sheet principal |
| `src/components/conducteur/TransportMateriauxSheet.tsx` | Formulaire complet |
| `src/components/conducteur/TransportMateriauxLigneRow.tsx` | Ligne du tableau |
| `src/hooks/useFichesTransportMateriaux.ts` | CRUD fiches matériaux |
| `src/hooks/useSendTransportMateriaux.ts` | Envoi email |
| `src/lib/transportMateriauxExcelExport.ts` | Génération Excel |
| `supabase/functions/send-transport-materiaux/index.ts` | Edge function email |

---

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/ValidationConducteur.tsx` | Ajouter le bouton TransportMateriauxButton |
| `src/config/enterprises/types.ts` | Ajouter feature `transportMateriaux` |
| `src/config/enterprises/limoge-revillon.ts` | Activer la feature |
| `src/integrations/supabase/types.ts` | Mise à jour auto après migration |

---

## Migration SQL

```sql
-- 1. Ajouter email_depot aux entreprises
ALTER TABLE entreprises ADD COLUMN email_depot text;

-- 2. Créer la table principale
CREATE TABLE fiches_transport_materiaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid NOT NULL REFERENCES entreprises(id),
  chantier_id uuid NOT NULL REFERENCES chantiers(id),
  conducteur_id uuid NOT NULL REFERENCES utilisateurs(id),
  semaine_livraison integer NOT NULL,
  jour_livraison date NOT NULL,
  moyen_transport text DEFAULT 'Camion grue',
  responsable_depot text,
  statut text DEFAULT 'BROUILLON',
  transmise_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Créer la table des lignes
CREATE TABLE fiches_transport_materiaux_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id uuid NOT NULL REFERENCES fiches_transport_materiaux(id) ON DELETE CASCADE,
  categorie text DEFAULT 'Matériel',
  designation text NOT NULL,
  unite text DEFAULT 'U',
  quantite numeric NOT NULL DEFAULT 1,
  reel_charge numeric,
  entreprise_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. RLS policies (isolation multi-tenant)
ALTER TABLE fiches_transport_materiaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiches_transport_materiaux_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access fiches_transport_materiaux of their company"
ON fiches_transport_materiaux FOR ALL
USING (user_has_access_to_entreprise(entreprise_id))
WITH CHECK (user_has_access_to_entreprise(entreprise_id));

CREATE POLICY "Users can access fiches_transport_materiaux_lignes of their company"
ON fiches_transport_materiaux_lignes FOR ALL
USING (user_has_access_to_entreprise(entreprise_id))
WITH CHECK (user_has_access_to_entreprise(entreprise_id));

-- 5. Trigger pour entreprise_id automatique sur les lignes
CREATE OR REPLACE FUNCTION set_entreprise_from_fiche_transport_materiaux()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.fiche_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.fiches_transport_materiaux WHERE id = NEW.fiche_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_set_entreprise_lignes_materiaux
BEFORE INSERT ON fiches_transport_materiaux_lignes
FOR EACH ROW
EXECUTE FUNCTION set_entreprise_from_fiche_transport_materiaux();
```

---

## Workflow utilisateur

```
1. Conducteur ouvre page "Mes heures"
2. Clique sur "📦 Demande transport matériaux"
3. Sheet s'ouvre avec formulaire vide
4. Sélectionne le chantier → auto-remplissage infos
5. Renseigne semaine/jour de livraison
6. Ajoute les matériaux ligne par ligne
7. Clique "Transmettre au dépôt"
8. → Excel généré
9. → Email envoyé à depot@groupe-engo.com
10. → Toast de confirmation
11. → Fiche marquée comme TRANSMISE
```

---

## Sécurité

- Isolation multi-tenant via `entreprise_id` sur les deux tables
- RLS policies utilisant `user_has_access_to_entreprise()`
- Seuls les conducteurs voient le bouton (vérification du rôle)
- Edge function utilise `SUPABASE_SERVICE_ROLE_KEY` pour générer l'email

---

## Configuration email dépôt

Pour configurer l'email du dépôt, un admin devra :
1. Aller dans le panneau d'administration
2. Ou exécuter directement en SQL :

```sql
UPDATE entreprises 
SET email_depot = 'depot@groupe-engo.com' 
WHERE slug = 'limoge-revillon';
```

---

## Estimation de travail

| Phase | Composants | Complexité |
|-------|------------|------------|
| Phase 1 | Migration SQL + tables | Simple |
| Phase 2 | Composants UI (Sheet + formulaire) | Moyenne |
| Phase 3 | Export Excel formaté | Moyenne |
| Phase 4 | Edge function email | Moyenne |
| Phase 5 | Intégration ValidationConducteur | Simple |

---

## Questions résolues

| Question | Réponse |
|----------|---------|
| Qui crée la fiche ? | Le conducteur |
| Format de transmission ? | Export Excel par email |
| Destinataire ? | Email fixe par entreprise (`email_depot`) |
| Où afficher ? | Page ValidationConducteur, onglet "Mes heures" |
