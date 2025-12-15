-- Table des conversations (1 par chantier)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_conversation_per_chantier UNIQUE(chantier_id)
);

-- Table des messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour tracker les messages lus par utilisateur
CREATE TABLE public.message_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_read_status_per_user_message UNIQUE(message_id, user_id)
);

-- Index pour performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_message_read_status_user_id ON public.message_read_status(user_id);
CREATE INDEX idx_conversations_entreprise_id ON public.conversations(entreprise_id);

-- Activer RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour conversations
-- Les utilisateurs peuvent voir les conversations de leur entreprise
CREATE POLICY "Users can view conversations of their enterprise"
ON public.conversations
FOR SELECT
USING (user_has_access_to_entreprise(entreprise_id));

-- Les utilisateurs peuvent créer des conversations pour leur entreprise
CREATE POLICY "Users can create conversations for their enterprise"
ON public.conversations
FOR INSERT
WITH CHECK (user_has_access_to_entreprise(entreprise_id));

-- RLS Policies pour messages
-- Les utilisateurs peuvent voir les messages des conversations de leur entreprise
CREATE POLICY "Users can view messages of their enterprise conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND user_has_access_to_entreprise(c.entreprise_id)
  )
);

-- Les utilisateurs peuvent envoyer des messages dans les conversations de leur entreprise
CREATE POLICY "Users can send messages to their enterprise conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND user_has_access_to_entreprise(c.entreprise_id)
  )
);

-- RLS Policies pour message_read_status
-- Les utilisateurs peuvent voir leur propre statut de lecture
CREATE POLICY "Users can view their own read status"
ON public.message_read_status
FOR SELECT
USING (user_id = auth.uid());

-- Les utilisateurs peuvent marquer leurs propres messages comme lus
CREATE POLICY "Users can mark messages as read"
ON public.message_read_status
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent supprimer leur propre statut de lecture
CREATE POLICY "Users can delete their own read status"
ON public.message_read_status
FOR DELETE
USING (user_id = auth.uid());

-- Activer Realtime sur la table messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;