-- Ajouter la policy UPDATE manquante pour message_read_status
CREATE POLICY "Users can update their own read status" 
ON public.message_read_status 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());