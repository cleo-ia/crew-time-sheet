-- Create table for task documents
CREATE TABLE public.taches_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tache_id UUID NOT NULL REFERENCES public.taches_chantier(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.taches_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view task documents"
ON public.taches_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert task documents"
ON public.taches_documents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete task documents"
ON public.taches_documents FOR DELETE
TO authenticated
USING (true);

-- Create storage bucket for task documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('taches-documents', 'taches-documents', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload task documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'taches-documents');

CREATE POLICY "Anyone can view task documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'taches-documents');

CREATE POLICY "Authenticated users can delete task documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'taches-documents');