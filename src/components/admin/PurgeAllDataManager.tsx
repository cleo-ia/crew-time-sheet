import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const PurgeAllDataManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  
  const queryClient = useQueryClient();

  const handlePurgeAll = async () => {
    const confirmed = window.confirm(
      "⚠️ ATTENTION ⚠️\n\n" +
      "Vous êtes sur le point de SUPPRIMER TOUTES LES DONNÉES de test dans TOUTES les tables :\n\n" +
      "• Toutes les fiches (toutes semaines)\n" +
      "• Tous les jours de fiches\n" +
      "• Toutes les signatures\n" +
      "• Tous les transports (chefs/maçons)\n" +
      "• Tous les transports finisseurs\n" +
      "• Toutes les affectations finisseurs\n\n" +
      "Cette action est IRRÉVERSIBLE !\n\n" +
      "Voulez-vous vraiment continuer ?"
    );

    if (!confirmed) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      console.log("[PurgeAllDataManager] Starting complete purge...");
      
      const { data, error } = await supabase.functions.invoke("purge-all-test-data", {
        body: {},
      });

      if (error) throw error;

      setLastResult(data);
      
      // Invalider tous les caches
      await queryClient.invalidateQueries({ queryKey: ["fiches"] });
      await queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
      await queryClient.invalidateQueries({ queryKey: ["transport-data-v2"] });
      await queryClient.invalidateQueries({ queryKey: ["transport-data"] });
      await queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      await queryClient.invalidateQueries({ queryKey: ["rh-data"] });
      await queryClient.invalidateQueries({ queryKey: ["validation-fiches"] });
      await queryClient.invalidateQueries({ queryKey: ["affectations"] });

      toast.success(
        `✅ Purge totale réussie : ${data.total} enregistrement(s) supprimé(s)`,
        { 
          description: "Toutes les données de test ont été supprimées.",
          duration: 5000 
        }
      );

      console.log("[PurgeAllDataManager] Purge completed:", data);
    } catch (err: any) {
      console.error("[PurgeAllDataManager] Error:", err);
      toast.error("❌ Erreur lors de la purge", {
        description: err.message || "Vérifiez les logs de la fonction edge",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Purge Totale - DANGER
        </CardTitle>
        <CardDescription>
          Supprimer TOUTES les données de test dans TOUTES les tables (fiches, transport, affectations, signatures).
          Cette action est irréversible !
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ ATTENTION - ACTION IRRÉVERSIBLE ⚠️</strong>
            <br />
            Cette action supprimera définitivement TOUTES les données suivantes :
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>Toutes les fiches (toutes semaines confondues)</li>
              <li>Tous les fiches_jours</li>
              <li>Toutes les signatures</li>
              <li>Tous les fiches_transport (chefs/maçons)</li>
              <li>Tous les fiches_transport_jours</li>
              <li>Tous les fiches_transport_finisseurs</li>
              <li>Tous les fiches_transport_finisseurs_jours</li>
              <li>Toutes les affectations_finisseurs_jours</li>
            </ul>
            <p className="mt-2 font-semibold">
              Les chantiers, utilisateurs et véhicules ne sont PAS affectés.
            </p>
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handlePurgeAll} 
          disabled={isLoading}
          variant="destructive"
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Suppression en cours...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              🔥 SUPPRIMER TOUTES LES DONNÉES 🔥
            </>
          )}
        </Button>

        {lastResult && (
          <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <AlertDescription className="text-sm">
              <strong>✅ Résultat de la purge :</strong>
              <ul className="mt-2 space-y-1">
                <li>✓ Signatures : {lastResult.deleted?.signatures || 0}</li>
                <li>✓ Transport finisseurs (jours) : {lastResult.deleted?.fiches_transport_finisseurs_jours || 0}</li>
                <li>✓ Transport finisseurs : {lastResult.deleted?.fiches_transport_finisseurs || 0}</li>
                <li>✓ Transport (jours) : {lastResult.deleted?.fiches_transport_jours || 0}</li>
                <li>✓ Transport : {lastResult.deleted?.fiches_transport || 0}</li>
                <li>✓ Affectations finisseurs : {lastResult.deleted?.affectations_finisseurs_jours || 0}</li>
                <li>✓ Fiches (jours) : {lastResult.deleted?.fiches_jours || 0}</li>
                <li>✓ Fiches : {lastResult.deleted?.fiches || 0}</li>
                <li className="font-bold text-green-700 dark:text-green-400 mt-2">
                  → Total : {lastResult.total} enregistrement(s) supprimé(s)
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
