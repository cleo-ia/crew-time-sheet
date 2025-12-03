-- Add afficher_planning column to todos_chantier table
ALTER TABLE public.todos_chantier 
ADD COLUMN afficher_planning boolean NOT NULL DEFAULT false;