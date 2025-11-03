-- Add signature_data column to signatures table
ALTER TABLE public.signatures 
ADD COLUMN signature_data TEXT;

COMMENT ON COLUMN public.signatures.signature_data IS 'Image de la signature en format base64 (data:image/png;base64,...)';