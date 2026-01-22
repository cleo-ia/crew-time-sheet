
-- =====================================================
-- MIGRATION: Isolation complète des données par entreprise
-- =====================================================

-- 1. NETTOYAGE: Supprimer la signature orpheline
DELETE FROM signatures WHERE fiche_id NOT IN (SELECT id FROM fiches);

-- =====================================================
-- PHASE 1: Ajouter les colonnes entreprise_id (nullable)
-- =====================================================

-- Tables avec chantier_id direct (niveau 1)
ALTER TABLE achats_chantier ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE affectations ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE affectations_finisseurs_jours ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE chantiers_documents ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE chantiers_dossiers ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE fiches_transport ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE taches_chantier ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE todos_chantier ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);

-- Tables avec fiche_id (niveau 2)
ALTER TABLE fiches_jours ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE fiches_transport_finisseurs ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE ratios_journaliers ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);

-- Tables niveau 3
ALTER TABLE fiches_transport_jours ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE fiches_transport_finisseurs_jours ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE taches_documents ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE todos_documents ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);

-- Tables messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);
ALTER TABLE message_read_status ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);

-- Table conducteurs_chefs
ALTER TABLE conducteurs_chefs ADD COLUMN IF NOT EXISTS entreprise_id uuid REFERENCES entreprises(id);

-- =====================================================
-- PHASE 1b: Créer les index pour performances
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_fiches_entreprise ON fiches(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_fiches_jours_entreprise ON fiches_jours(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_signatures_entreprise ON signatures(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_affectations_entreprise ON affectations(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_affectations_finisseurs_jours_entreprise ON affectations_finisseurs_jours(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_fiches_transport_entreprise ON fiches_transport(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_fiches_transport_jours_entreprise ON fiches_transport_jours(entreprise_id);

-- =====================================================
-- PHASE 2: Backfill des données existantes
-- =====================================================

-- NIVEAU 1: Tables avec chantier_id direct
UPDATE achats_chantier a SET entreprise_id = c.entreprise_id 
FROM chantiers c WHERE a.chantier_id = c.id AND a.entreprise_id IS NULL;

UPDATE affectations a SET entreprise_id = c.entreprise_id 
FROM chantiers c WHERE a.chantier_id = c.id AND a.entreprise_id IS NULL;

UPDATE affectations_finisseurs_jours a SET entreprise_id = c.entreprise_id 
FROM chantiers c WHERE a.chantier_id = c.id AND a.entreprise_id IS NULL;

UPDATE chantiers_documents cd SET entreprise_id = c.entreprise_id 
FROM chantiers c WHERE cd.chantier_id = c.id AND cd.entreprise_id IS NULL;

UPDATE chantiers_dossiers cd SET entreprise_id = c.entreprise_id 
FROM chantiers c WHERE cd.chantier_id = c.id AND cd.entreprise_id IS NULL;

-- Fiches avec chantier_id
UPDATE fiches f SET entreprise_id = c.entreprise_id 
FROM chantiers c WHERE f.chantier_id = c.id AND f.entreprise_id IS NULL;

-- Fiches finisseurs SANS chantier_id -> via salarie_id
UPDATE fiches f SET entreprise_id = u.entreprise_id 
FROM utilisateurs u 
WHERE f.salarie_id = u.id 
AND f.chantier_id IS NULL 
AND f.entreprise_id IS NULL;

UPDATE fiches_transport ft SET entreprise_id = c.entreprise_id 
FROM chantiers c WHERE ft.chantier_id = c.id AND ft.entreprise_id IS NULL;

UPDATE taches_chantier t SET entreprise_id = c.entreprise_id 
FROM chantiers c WHERE t.chantier_id = c.id AND t.entreprise_id IS NULL;

UPDATE todos_chantier t SET entreprise_id = c.entreprise_id 
FROM chantiers c WHERE t.chantier_id = c.id AND t.entreprise_id IS NULL;

-- NIVEAU 2: Tables avec fiche_id
UPDATE fiches_jours fj SET entreprise_id = f.entreprise_id 
FROM fiches f WHERE fj.fiche_id = f.id AND fj.entreprise_id IS NULL;

UPDATE signatures s SET entreprise_id = f.entreprise_id 
FROM fiches f WHERE s.fiche_id = f.id AND s.entreprise_id IS NULL;

UPDATE fiches_transport_finisseurs ftf SET entreprise_id = f.entreprise_id 
FROM fiches f WHERE ftf.fiche_id = f.id AND ftf.entreprise_id IS NULL;

UPDATE ratios_journaliers r SET entreprise_id = f.entreprise_id 
FROM fiches f WHERE r.fiche_id = f.id AND r.entreprise_id IS NULL;

-- NIVEAU 3: Tables enfants
UPDATE fiches_transport_jours ftj SET entreprise_id = ft.entreprise_id 
FROM fiches_transport ft WHERE ftj.fiche_transport_id = ft.id AND ftj.entreprise_id IS NULL;

UPDATE fiches_transport_finisseurs_jours ftfj SET entreprise_id = ftf.entreprise_id 
FROM fiches_transport_finisseurs ftf 
WHERE ftfj.fiche_transport_finisseur_id = ftf.id AND ftfj.entreprise_id IS NULL;

UPDATE taches_documents td SET entreprise_id = t.entreprise_id 
FROM taches_chantier t WHERE td.tache_id = t.id AND td.entreprise_id IS NULL;

UPDATE todos_documents td SET entreprise_id = t.entreprise_id 
FROM todos_chantier t WHERE td.todo_id = t.id AND td.entreprise_id IS NULL;

-- Messages via conversations
UPDATE messages m SET entreprise_id = c.entreprise_id 
FROM conversations c WHERE m.conversation_id = c.id AND m.entreprise_id IS NULL;

UPDATE message_read_status mrs SET entreprise_id = m.entreprise_id 
FROM messages m WHERE mrs.message_id = m.id AND mrs.entreprise_id IS NULL;

-- Conducteurs_chefs via conducteur
UPDATE conducteurs_chefs cc SET entreprise_id = u.entreprise_id 
FROM utilisateurs u WHERE cc.conducteur_id = u.id AND cc.entreprise_id IS NULL;

-- =====================================================
-- PHASE 3: Contraintes NOT NULL
-- =====================================================

-- Tables critiques: rendre NOT NULL
ALTER TABLE fiches ALTER COLUMN entreprise_id SET NOT NULL;
ALTER TABLE fiches_jours ALTER COLUMN entreprise_id SET NOT NULL;
ALTER TABLE signatures ALTER COLUMN entreprise_id SET NOT NULL;
ALTER TABLE fiches_transport ALTER COLUMN entreprise_id SET NOT NULL;
ALTER TABLE fiches_transport_jours ALTER COLUMN entreprise_id SET NOT NULL;
ALTER TABLE affectations ALTER COLUMN entreprise_id SET NOT NULL;
ALTER TABLE chantiers_dossiers ALTER COLUMN entreprise_id SET NOT NULL;

-- Tables secondaires: NOT NULL si données existent
DO $$
BEGIN
  -- achats_chantier
  IF NOT EXISTS (SELECT 1 FROM achats_chantier WHERE entreprise_id IS NULL) THEN
    ALTER TABLE achats_chantier ALTER COLUMN entreprise_id SET NOT NULL;
  END IF;
  
  -- affectations_finisseurs_jours
  IF NOT EXISTS (SELECT 1 FROM affectations_finisseurs_jours WHERE entreprise_id IS NULL) THEN
    ALTER TABLE affectations_finisseurs_jours ALTER COLUMN entreprise_id SET NOT NULL;
  END IF;
  
  -- taches_chantier
  IF NOT EXISTS (SELECT 1 FROM taches_chantier WHERE entreprise_id IS NULL) THEN
    ALTER TABLE taches_chantier ALTER COLUMN entreprise_id SET NOT NULL;
  END IF;
  
  -- todos_chantier
  IF NOT EXISTS (SELECT 1 FROM todos_chantier WHERE entreprise_id IS NULL) THEN
    ALTER TABLE todos_chantier ALTER COLUMN entreprise_id SET NOT NULL;
  END IF;
END $$;

-- =====================================================
-- PHASE 4: Triggers pour auto-populate sur INSERT
-- =====================================================

-- Fonction générique pour tables avec chantier_id
CREATE OR REPLACE FUNCTION public.set_entreprise_from_chantier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.chantier_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.chantiers WHERE id = NEW.chantier_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour fiches (chantier_id OU salarie_id)
CREATE OR REPLACE FUNCTION public.set_fiche_entreprise_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entreprise_id IS NULL THEN
    -- D'abord essayer via chantier_id
    IF NEW.chantier_id IS NOT NULL THEN
      SELECT entreprise_id INTO NEW.entreprise_id
      FROM public.chantiers WHERE id = NEW.chantier_id;
    END IF;
    -- Sinon via salarie_id (cas finisseurs)
    IF NEW.entreprise_id IS NULL AND NEW.salarie_id IS NOT NULL THEN
      SELECT entreprise_id INTO NEW.entreprise_id
      FROM public.utilisateurs WHERE id = NEW.salarie_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour tables enfants avec fiche_id
CREATE OR REPLACE FUNCTION public.set_entreprise_from_fiche()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.fiche_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.fiches WHERE id = NEW.fiche_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour fiches_transport_jours
CREATE OR REPLACE FUNCTION public.set_entreprise_from_fiche_transport()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.fiche_transport_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.fiches_transport WHERE id = NEW.fiche_transport_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour fiches_transport_finisseurs_jours
CREATE OR REPLACE FUNCTION public.set_entreprise_from_fiche_transport_finisseur()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.fiche_transport_finisseur_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.fiches_transport_finisseurs WHERE id = NEW.fiche_transport_finisseur_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour messages
CREATE OR REPLACE FUNCTION public.set_entreprise_from_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.conversation_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.conversations WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour message_read_status
CREATE OR REPLACE FUNCTION public.set_entreprise_from_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.message_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.messages WHERE id = NEW.message_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour taches_documents
CREATE OR REPLACE FUNCTION public.set_entreprise_from_tache()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.tache_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.taches_chantier WHERE id = NEW.tache_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour todos_documents
CREATE OR REPLACE FUNCTION public.set_entreprise_from_todo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.todo_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.todos_chantier WHERE id = NEW.todo_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour conducteurs_chefs
CREATE OR REPLACE FUNCTION public.set_entreprise_from_conducteur()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.conducteur_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.utilisateurs WHERE id = NEW.conducteur_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Créer les triggers
-- =====================================================

-- Tables avec chantier_id
DROP TRIGGER IF EXISTS tr_achats_set_entreprise ON achats_chantier;
CREATE TRIGGER tr_achats_set_entreprise
BEFORE INSERT ON achats_chantier FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_chantier();

DROP TRIGGER IF EXISTS tr_affectations_set_entreprise ON affectations;
CREATE TRIGGER tr_affectations_set_entreprise
BEFORE INSERT ON affectations FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_chantier();

DROP TRIGGER IF EXISTS tr_affectations_finisseurs_set_entreprise ON affectations_finisseurs_jours;
CREATE TRIGGER tr_affectations_finisseurs_set_entreprise
BEFORE INSERT ON affectations_finisseurs_jours FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_chantier();

DROP TRIGGER IF EXISTS tr_chantiers_documents_set_entreprise ON chantiers_documents;
CREATE TRIGGER tr_chantiers_documents_set_entreprise
BEFORE INSERT ON chantiers_documents FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_chantier();

DROP TRIGGER IF EXISTS tr_chantiers_dossiers_set_entreprise ON chantiers_dossiers;
CREATE TRIGGER tr_chantiers_dossiers_set_entreprise
BEFORE INSERT ON chantiers_dossiers FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_chantier();

DROP TRIGGER IF EXISTS tr_fiches_transport_set_entreprise ON fiches_transport;
CREATE TRIGGER tr_fiches_transport_set_entreprise
BEFORE INSERT ON fiches_transport FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_chantier();

DROP TRIGGER IF EXISTS tr_taches_set_entreprise ON taches_chantier;
CREATE TRIGGER tr_taches_set_entreprise
BEFORE INSERT ON taches_chantier FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_chantier();

DROP TRIGGER IF EXISTS tr_todos_set_entreprise ON todos_chantier;
CREATE TRIGGER tr_todos_set_entreprise
BEFORE INSERT ON todos_chantier FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_chantier();

-- Fiches (logique spéciale chantier OU salarie)
DROP TRIGGER IF EXISTS tr_fiches_set_entreprise ON fiches;
CREATE TRIGGER tr_fiches_set_entreprise
BEFORE INSERT ON fiches FOR EACH ROW EXECUTE FUNCTION set_fiche_entreprise_id();

-- Tables avec fiche_id
DROP TRIGGER IF EXISTS tr_fiches_jours_set_entreprise ON fiches_jours;
CREATE TRIGGER tr_fiches_jours_set_entreprise
BEFORE INSERT ON fiches_jours FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_fiche();

DROP TRIGGER IF EXISTS tr_signatures_set_entreprise ON signatures;
CREATE TRIGGER tr_signatures_set_entreprise
BEFORE INSERT ON signatures FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_fiche();

DROP TRIGGER IF EXISTS tr_fiches_transport_finisseurs_set_entreprise ON fiches_transport_finisseurs;
CREATE TRIGGER tr_fiches_transport_finisseurs_set_entreprise
BEFORE INSERT ON fiches_transport_finisseurs FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_fiche();

DROP TRIGGER IF EXISTS tr_ratios_set_entreprise ON ratios_journaliers;
CREATE TRIGGER tr_ratios_set_entreprise
BEFORE INSERT ON ratios_journaliers FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_fiche();

-- Tables niveau 3
DROP TRIGGER IF EXISTS tr_fiches_transport_jours_set_entreprise ON fiches_transport_jours;
CREATE TRIGGER tr_fiches_transport_jours_set_entreprise
BEFORE INSERT ON fiches_transport_jours FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_fiche_transport();

DROP TRIGGER IF EXISTS tr_fiches_transport_finisseurs_jours_set_entreprise ON fiches_transport_finisseurs_jours;
CREATE TRIGGER tr_fiches_transport_finisseurs_jours_set_entreprise
BEFORE INSERT ON fiches_transport_finisseurs_jours FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_fiche_transport_finisseur();

DROP TRIGGER IF EXISTS tr_taches_documents_set_entreprise ON taches_documents;
CREATE TRIGGER tr_taches_documents_set_entreprise
BEFORE INSERT ON taches_documents FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_tache();

DROP TRIGGER IF EXISTS tr_todos_documents_set_entreprise ON todos_documents;
CREATE TRIGGER tr_todos_documents_set_entreprise
BEFORE INSERT ON todos_documents FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_todo();

-- Messages
DROP TRIGGER IF EXISTS tr_messages_set_entreprise ON messages;
CREATE TRIGGER tr_messages_set_entreprise
BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_conversation();

DROP TRIGGER IF EXISTS tr_message_read_status_set_entreprise ON message_read_status;
CREATE TRIGGER tr_message_read_status_set_entreprise
BEFORE INSERT ON message_read_status FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_message();

-- Conducteurs_chefs
DROP TRIGGER IF EXISTS tr_conducteurs_chefs_set_entreprise ON conducteurs_chefs;
CREATE TRIGGER tr_conducteurs_chefs_set_entreprise
BEFORE INSERT ON conducteurs_chefs FOR EACH ROW EXECUTE FUNCTION set_entreprise_from_conducteur();
