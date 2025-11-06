import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, AlertTriangle } from "lucide-react";

export const PurgeAllTestDataManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const handlePurgeAll = async () => {
    if (!confirm("⚠️ ATTENTION : Cette action va supprimer TOUTES les données de test de la base de données. Êtes-vous sûr ?")) {
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("purge-all-test-data", {
        method: "POST",
      });

      if (error) throw error;

      setLastResult(data);

      // Invalider tous les caches
      await queryClient.invalidateQueries({ queryKey: ["fiches"] });
      await queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
      await queryClient.invalidateQueries({ queryKey: ["transport"] });
      await queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      await queryClient.invalidateQueries({ queryKey: ["rh-data"] });
      await queryClient.invalidateQueries({ queryKey: ["validation-fiches"] });

      // Dispatch global event
      window.dispatchEvent(new CustomEvent("test-data-purged"));

      toast({
        title: "✅ Purge terminée",
        description: `${data.totalDeleted || 0} enregistrements supprimés`,
      });
    } catch (error: any) {
      console.error("Erreur lors de la purge:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de purger les données",
      });
      setLastResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Purge Totale des Données de Test
        </CardTitle>
        <CardDescription>
          Supprimer TOUTES les données de test de la base de données
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action irréversible :</strong> Cette opération supprimera toutes les données de test de toutes les tables (fiches, signatures, transport, etc.). Utilisez avec précaution.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={handlePurgeAll}
            disabled={isLoading}
            variant="destructive"
            size="lg"
          >
            {isLoading ? "Purge en cours..." : "🗑️ Purger toutes les données de test"}
          </Button>
        </div>

        {lastResult && (
          <Alert variant={lastResult.error ? "destructive" : "default"}>
            <AlertDescription>
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
