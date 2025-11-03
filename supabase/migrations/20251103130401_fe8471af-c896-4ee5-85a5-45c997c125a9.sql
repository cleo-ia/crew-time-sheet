-- Créer l'ENUM pour les types d'absences
CREATE TYPE type_absence AS ENUM (
  'CP',              -- Congés payés
  'RTT',             -- Récupération du temps de travail
  'AM',              -- Absence maladie
  'MP',              -- Maladie professionnelle
  'AT',              -- Accident du travail
  'CONGE_PARENTAL',  -- Congé parental
  'HI',              -- Intempéries
  'CPSS',            -- CPSS
  'ABS_INJ'          -- Absence injustifiée
);

-- Ajouter la colonne type_absence à la table fiches_jours
ALTER TABLE public.fiches_jours 
ADD COLUMN type_absence type_absence NULL;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX idx_fiches_jours_type_absence ON public.fiches_jours(type_absence) WHERE type_absence IS NOT NULL;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN public.fiches_jours.type_absence IS 'Type d''absence qualifié par la RH (CP, RTT, AM, MP, AT, CONGE_PARENTAL, HI, CPSS, ABS_INJ)';