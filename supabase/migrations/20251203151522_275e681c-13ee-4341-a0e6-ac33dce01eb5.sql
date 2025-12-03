-- Create todos_documents table
CREATE TABLE public.todos_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID NOT NULL REFERENCES public.todos_chantier(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.todos_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view todo documents" 
ON public.todos_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert todo documents" 
ON public.todos_documents 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete todo documents" 
ON public.todos_documents 
FOR DELETE 
USING (true);

-- Create storage bucket for todo documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('todos-documents', 'todos-documents', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload todo documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'todos-documents');

CREATE POLICY "Authenticated users can view todo documents storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'todos-documents');

CREATE POLICY "Authenticated users can delete todo documents storage"
ON storage.objects FOR DELETE
USING (bucket_id = 'todos-documents');