-- Create storage bucket for chantier documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('chantiers-documents', 'chantiers-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create table for document metadata
CREATE TABLE public.chantiers_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chantiers_documents ENABLE ROW LEVEL SECURITY;

-- RLS policy for chantiers_documents (allow all for authenticated users like other tables)
CREATE POLICY "Allow all access for authenticated users"
ON public.chantiers_documents
FOR ALL
USING (true)
WITH CHECK (true);

-- Storage policies for the bucket
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chantiers-documents');

CREATE POLICY "Allow authenticated upload"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'chantiers-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'chantiers-documents' AND auth.role() = 'authenticated');