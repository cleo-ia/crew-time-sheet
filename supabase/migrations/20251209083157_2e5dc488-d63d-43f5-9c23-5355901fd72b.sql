-- Phase 1: Ajouter le statut CLOTURE et enrichir la table periodes_cloturees

-- 1. Ajouter le statut CLOTURE à l'enum statut_fiche
ALTER TYPE public.statut_fiche ADD VALUE IF NOT EXISTS 'CLOTURE';

-- 2. Enrichir la table periodes_cloturees avec toutes les stats pour archivage complet
ALTER TABLE public.periodes_cloturees 
  ADD COLUMN IF NOT EXISTS total_heures_normales NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_heures_supp NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_heures_supp_25 NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_heures_supp_50 NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_absences INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_intemperies NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paniers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_trajets INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_chantiers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trajets_par_code JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fichier_excel TEXT;