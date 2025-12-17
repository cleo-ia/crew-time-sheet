import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserInfo {
  userId: string;
  userName: string;
  entrepriseId: string;
}

export function useCurrentUserInfo() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const entrepriseId = localStorage.getItem("current_entreprise_id");
        if (!entrepriseId) return;

        // Récupérer le nom de l'utilisateur depuis profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        const userName = profile 
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || user.email || "Utilisateur"
          : user.email || "Utilisateur";

        setUserInfo({
          userId: user.id,
          userName,
          entrepriseId,
        });
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, []);

  return userInfo;
}
