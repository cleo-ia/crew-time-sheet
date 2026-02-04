import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransportSheet } from "@/types/transport";

/**
 * Hook unifié pour récupérer les données de transport d'un chantier.
 * 
 * Stratégie :
 * 1. Tente d'abord de récupérer depuis fiches_transport (workflow chef d'équipe)
 * 2. Si rien trouvé, fallback vers fiches_transport_finisseurs (workflow conducteur pour chantiers sans chef)
 * 
 * Retourne les données dans un format TransportSheet unifié compatible avec TransportSummaryV2.
 */
export const useTransportByChantierUnified = (chantierId: string | null, semaine: string | null) => {
  return useQuery({
    queryKey: ["transport-by-chantier-unified", chantierId, semaine],
    queryFn: async (): Promise<TransportSheet | null> => {
      if (!chantierId || !semaine) return null;

      try {
        console.log("[useTransportByChantierUnified] Query", { chantierId, semaine });
        
        // 1. Essayer d'abord fiches_transport (workflow chef)
        const transportChef = await fetchFromFichesTransport(chantierId, semaine);
        if (transportChef) {
          console.log("[useTransportByChantierUnified] Found chef transport data");
          return transportChef;
        }

        // 2. Fallback : chercher dans fiches_transport_finisseurs (workflow conducteur)
        const transportFinisseurs = await fetchFromFichesTransportFinisseurs(chantierId, semaine);
        if (transportFinisseurs) {
          console.log("[useTransportByChantierUnified] Found finisseurs transport data");
          return transportFinisseurs;
        }

        console.log("[useTransportByChantierUnified] No transport data found");
        return null;
      } catch (error) {
        console.error("[useTransportByChantierUnified] Error:", error);
        return null;
      }
    },
    enabled: !!chantierId && !!semaine,
  });
};

/**
 * Récupère les données de transport depuis fiches_transport (workflow chef)
 */
async function fetchFromFichesTransport(chantierId: string, semaine: string): Promise<TransportSheet | null> {
  // Récupérer la fiche transport par chantier et semaine
  const { data: transport, error: transportError } = await supabase
    .from("fiches_transport")
    .select("*")
    .eq("chantier_id", chantierId)
    .eq("semaine", semaine)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (transportError) throw transportError;

  let found = transport;

  // Tolérance aux variantes de semaine (S/W)
  if (!found && typeof semaine === "string") {
    const variants = Array.from(new Set([semaine, semaine.replace("-S", "-W"), semaine.replace("-W", "-S")]));
    for (const v of variants) {
      if (v === semaine) continue;
      const { data: t, error: e } = await supabase
        .from("fiches_transport")
        .select("*")
        .eq("chantier_id", chantierId)
        .eq("semaine", v)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (e) throw e;
      if (t) { found = t; break; }
    }
  }

  if (!found) return null;

  // Récupérer les jours de transport
  const { data: jours, error: joursError } = await supabase
    .from("fiches_transport_jours")
    .select(
      `
      *,
      conducteur_aller:utilisateurs!fiches_transport_jours_conducteur_aller_id_fkey(id, nom, prenom),
      conducteur_retour:utilisateurs!fiches_transport_jours_conducteur_retour_id_fkey(id, nom, prenom)
    `
    )
    .eq("fiche_transport_id", found.id)
    .order("date");

  if (joursError) throw joursError;

  // Récupérer le code chantier principal
  const { data: chantier } = await supabase
    .from("chantiers")
    .select("code_chantier")
    .eq("id", found.chantier_id)
    .maybeSingle();

  const defaultCode = chantier?.code_chantier || "-";

  // Récupérer les codes chantier depuis fiches_jours
  const { data: fichesJours } = await supabase
    .from("fiches_jours")
    .select("date, code_chantier_du_jour")
    .eq("fiche_id", found.fiche_id);

  const chantierByDate = new Map(
    (fichesJours || []).map((fj: any) => [fj.date, fj.code_chantier_du_jour])
  );

  return {
    id: found.id,
    ficheId: found.fiche_id,
    semaine: found.semaine,
    chantierId: found.chantier_id,
    days: (jours || []).map((jour: any) => ({
      date: jour.date,
      conducteurAllerId: jour.conducteur_aller_id || "",
      conducteurAllerNom: jour.conducteur_aller 
        ? `${jour.conducteur_aller.prenom} ${jour.conducteur_aller.nom}` 
        : "",
      conducteurRetourId: jour.conducteur_retour_id || "",
      conducteurRetourNom: jour.conducteur_retour 
        ? `${jour.conducteur_retour.prenom} ${jour.conducteur_retour.nom}` 
        : "",
      immatriculation: jour.immatriculation || "",
      codeChantierDuJour: chantierByDate.get(jour.date) || defaultCode,
    })),
  };
}

/**
 * Récupère les données de transport depuis fiches_transport_finisseurs (workflow conducteur pour chantiers sans chef)
 * et les transforme en format TransportSheet unifié.
 */
async function fetchFromFichesTransportFinisseurs(chantierId: string, semaine: string): Promise<TransportSheet | null> {
  // Récupérer les fiche_ids pour ce chantier/semaine
  const { data: fiches, error: fichesError } = await supabase
    .from("fiches")
    .select("id")
    .eq("chantier_id", chantierId)
    .eq("semaine", semaine);

  if (fichesError) throw fichesError;
  if (!fiches?.length) return null;

  const ficheIds = fiches.map(f => f.id);

  // Récupérer les transports finisseurs liés à ces fiches
  const { data: transports, error: transportsError } = await supabase
    .from("fiches_transport_finisseurs")
    .select(`
      id, fiche_id, finisseur_id, semaine,
      finisseur:utilisateurs!fiches_transport_finisseurs_finisseur_id_fkey(id, nom, prenom),
      jours:fiches_transport_finisseurs_jours(
        id, date, immatriculation, conducteur_matin_id, conducteur_soir_id,
        conducteur_matin:utilisateurs!fiches_transport_finisseurs_jours_conducteur_matin_id_fkey(id, nom, prenom),
        conducteur_soir:utilisateurs!fiches_transport_finisseurs_jours_conducteur_soir_id_fkey(id, nom, prenom)
      )
    `)
    .in("fiche_id", ficheIds);

  if (transportsError) throw transportsError;
  if (!transports?.length) return null;

  // Récupérer le code chantier principal
  const { data: chantier } = await supabase
    .from("chantiers")
    .select("code_chantier")
    .eq("id", chantierId)
    .maybeSingle();

  const defaultCode = chantier?.code_chantier || "-";

  // Agréger tous les jours de tous les finisseurs par date
  const daysByDate = new Map<string, Array<{
    immatriculation: string;
    conducteurAllerId: string;
    conducteurAllerNom: string;
    conducteurRetourId: string;
    conducteurRetourNom: string;
  }>>();

  transports.forEach((transport: any) => {
    const finisseurNom = transport.finisseur 
      ? `${transport.finisseur.prenom} ${transport.finisseur.nom}`
      : "";

    (transport.jours || []).forEach((jour: any) => {
      if (!daysByDate.has(jour.date)) {
        daysByDate.set(jour.date, []);
      }
      
      // Pour les finisseurs, le conducteur est souvent le finisseur lui-même
      // On utilise les conducteurs matin/soir s'ils sont renseignés, sinon le finisseur
      const conducteurMatinNom = jour.conducteur_matin
        ? `${jour.conducteur_matin.prenom} ${jour.conducteur_matin.nom}`
        : finisseurNom;
      const conducteurSoirNom = jour.conducteur_soir
        ? `${jour.conducteur_soir.prenom} ${jour.conducteur_soir.nom}`
        : finisseurNom;

      daysByDate.get(jour.date)!.push({
        immatriculation: jour.immatriculation || "",
        conducteurAllerId: jour.conducteur_matin_id || transport.finisseur_id || "",
        conducteurAllerNom: conducteurMatinNom,
        conducteurRetourId: jour.conducteur_soir_id || transport.finisseur_id || "",
        conducteurRetourNom: conducteurSoirNom,
      });
    });
  });

  // Convertir en format TransportSheet.days[]
  // On flatten tous les véhicules par date
  const days: any[] = [];
  daysByDate.forEach((vehicules, date) => {
    vehicules.forEach(vehicule => {
      days.push({
        date,
        conducteurAllerId: vehicule.conducteurAllerId,
        conducteurAllerNom: vehicule.conducteurAllerNom,
        conducteurRetourId: vehicule.conducteurRetourId,
        conducteurRetourNom: vehicule.conducteurRetourNom,
        immatriculation: vehicule.immatriculation,
        codeChantierDuJour: defaultCode,
      });
    });
  });

  // Trier par date
  days.sort((a, b) => a.date.localeCompare(b.date));

  return {
    id: transports[0].id,
    ficheId: transports[0].fiche_id,
    semaine: transports[0].semaine,
    chantierId: chantierId,
    days,
  };
}
