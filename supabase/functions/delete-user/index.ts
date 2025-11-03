import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("userId est requis");
    }

    console.log("Suppression de l'utilisateur:", userId);

    // Étape 1: Trouver l'entrée dans utilisateurs correspondant à cet ID
    // Le userId peut être soit l'auth_user_id, soit l'id de la table utilisateurs
    const { data: utilisateurData, error: findError } = await supabaseAdmin
      .from("utilisateurs")
      .select("id, auth_user_id")
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .maybeSingle();

    if (findError) {
      console.error("Erreur lors de la recherche de l'utilisateur:", findError);
      throw findError;
    }

    if (!utilisateurData) {
      console.log("Aucun utilisateur trouvé avec cet ID dans la table utilisateurs");
    }

    // Étape 2: Si un utilisateur existe dans la table utilisateurs, le supprimer
    // Les cascades ON DELETE CASCADE supprimeront automatiquement:
    // - fiches (via salarie_id)
    // - affectations (via macon_id)
    // Les SET NULL mettront à NULL:
    // - fiches_transport_jours (conducteur_aller_id, conducteur_retour_id)
    // - chantiers (chef_id, conducteur_id)
    if (utilisateurData) {
      console.log("Suppression de l'utilisateur dans la table utilisateurs:", utilisateurData.id);
      const { error: deleteUtilisateurError } = await supabaseAdmin
        .from("utilisateurs")
        .delete()
        .eq("id", utilisateurData.id);

      if (deleteUtilisateurError) {
        console.error("Erreur lors de la suppression de utilisateurs:", deleteUtilisateurError);
        throw deleteUtilisateurError;
      }
    }

    // Étape 3: Supprimer l'utilisateur de auth.users (si il existe)
    // Les cascades ON DELETE CASCADE de auth.users supprimeront automatiquement:
    // - profiles
    // - user_roles
    // Utiliser l'auth_user_id si disponible, sinon l'userId reçu
    const authUserId = utilisateurData?.auth_user_id || userId;
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

    if (deleteAuthError) {
      // Si l'utilisateur n'existe pas dans auth.users, ce n'est pas grave
      if (deleteAuthError.status === 404 || deleteAuthError.code === 'user_not_found') {
        console.log("L'utilisateur n'existe pas dans auth.users, suppression uniquement de la table utilisateurs");
      } else {
        // Pour toute autre erreur, on lance l'exception
        console.error("Erreur lors de la suppression de auth.users:", deleteAuthError);
        throw deleteAuthError;
      }
    }

    console.log("Utilisateur supprimé avec succès de toutes les tables");

    return new Response(
      JSON.stringify({ success: true, message: "Utilisateur supprimé" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erreur inconnue" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});