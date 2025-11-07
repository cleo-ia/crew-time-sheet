import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";


export const TransportDebugManager = () => {
  const [semaine, setSemaine] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  
  const queryClient = useQueryClient();
  

  const handlePurge = async () => {
    if (!semaine) {
      toast.error("Veuillez spécifier une semaine (ex: 2025-S43)");
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("purge-transport-week", {
        body: { semaine },
      });

      if (error) throw error;

      setLastResult(data);
      
      // Invalider toutes les queries transport pour forcer un rechargement
      await queryClient.invalidateQueries({ queryKey: ["transport-data-v2"] });
      await queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
      await queryClient.invalidateQueries({ queryKey: ["fiches"] });

      // Émettre un évènement global pour que les feuilles ouvertes se réinitialisent
      window.dispatchEvent(new CustomEvent('transport-purged', { detail: { semaine } }));

      toast.success(
        `Suppression réussie : ${data.deleted_fiches} fiche(s) et ${data.deleted_jours} jour(s)`,
        { description: "Rechargez la page si les données persistent." }
      );
    } catch (err: any) {
      console.error("[TransportDebugManager] Error:", err);
      toast.error("Erreur lors de la suppression", {
        description: err.message || "Vérifiez les logs",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="space-y-4">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Debug Transport - Purge Semaine
          </CardTitle>
          <CardDescription>
            Supprimer toutes les données de transport pour une semaine (fiches_transport + jours).
            Utile pour nettoyer les données de test.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attention :</strong> Cette action supprime définitivement les données de transport
            (fiches_transport et fiches_transport_jours) pour la semaine spécifiée.
            Les fiches principales et les données finisseurs ne sont pas affectées.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="semaine">Semaine (format: YYYY-SXX)</Label>
          <Input
            id="semaine"
            placeholder="Ex: 2025-S43"
            value={semaine}
            onChange={(e) => setSemaine(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Button 
          onClick={handlePurge} 
          disabled={isLoading || !semaine}
          variant="destructive"
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Suppression en cours...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer les données transport
            </>
          )}
        </Button>

        {lastResult && (
          <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <AlertDescription className="text-sm">
              <strong>Résultat :</strong>
              <ul className="mt-2 space-y-1">
                <li>✓ Semaine : {lastResult.semaine}</li>
                <li>✓ Fiches supprimées : {lastResult.deleted_fiches}</li>
                <li>✓ Jours supprimés : {lastResult.deleted_jours}</li>
                {lastResult.note && <li className="text-muted-foreground">→ {lastResult.note}</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>

    </div>
  );
};
