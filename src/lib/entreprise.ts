import { supabase } from "@/integrations/supabase/client";

/**
 * Récupère l'entreprise_id courante avec fallback sur user_roles
 * et restauration automatique dans localStorage si manquant.
 * 
 * @returns Promise<string> - L'entreprise_id ou throw une erreur
 */
export async function getCurrentEntrepriseId(): Promise<string> {
  // 1. Priorité au localStorage
  const storedId = localStorage.getItem("current_entreprise_id");
  if (storedId) return storedId;

  // 2. Fallback: récupérer depuis user_roles
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("user_roles")
    .select("entreprise_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.entreprise_id) throw new Error("Aucune entreprise associée à cet utilisateur");

  // 3. Restaurer dans localStorage pour les prochains appels
  localStorage.setItem("current_entreprise_id", data.entreprise_id);
  console.log("[entreprise] localStorage restauré avec entreprise_id:", data.entreprise_id);

  return data.entreprise_id;
}
