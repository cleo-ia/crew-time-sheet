ALTER TABLE public.utilisateurs ADD COLUMN exclure_export_paie boolean NOT NULL DEFAULT false;

UPDATE public.utilisateurs SET exclure_export_paie = true WHERE id = '2df97afd-e91b-4681-ac27-4a000f33a1c7';