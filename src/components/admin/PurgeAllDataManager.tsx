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
    if (!confirm("⚠️ ATTENTION : Cette action va supprimer TOUTES les données de test (fiches, signatures, transport, affectations). Continuer ?")) {
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("purge-all-test-data");

      if (error) throw error;

      setLastResult(data);
      
      // Invalider toutes les queries
      await queryClient.invalidateQueries();

      toast.success("✅ Purge complète réussie", {
        description: `${data.total_deleted || 0} enregistrement(s) supprimé(s)`,
      });
    } catch (err: any) {
      console.error("[PurgeAllDataManager] Error:", err);
      toast.error("❌ Erreur lors de la purge", {
        description: err.message || "Vérifiez les logs",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Purge Complète des Données Test
        </CardTitle>
        <CardDescription>
          Supprime TOUTES les données de test : fiches, signatures, transport, affectations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ ACTION IRRÉVERSIBLE</strong>
            <br />
            Cette action supprime définitivement :
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>Toutes les signatures</li>
              <li>Toutes les fiches transport (maçons + finisseurs)</li>
              <li>Toutes les affectations (maçons + finisseurs)</li>
              <li>Toutes les fiches jours et fiches</li>
              <li>Toutes les périodes clôturées</li>
              <li>Tout l'historique des rappels</li>
            </ul>
            <br />
            <strong>Les utilisateurs, chantiers et véhicules sont conservés.</strong>
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
              Purge en cours...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Purger TOUTES les données de test
            </>
          )}
        </Button>

        {lastResult && (
          <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <AlertDescription className="text-sm">
              <strong>✅ Purge réussie !</strong>
              <ul className="mt-2 space-y-1">
                <li>Total supprimé : <strong>{lastResult.total_deleted || 0}</strong> enregistrement(s)</li>
                {lastResult.deleted_signatures > 0 && <li>• Signatures : {lastResult.deleted_signatures}</li>}
                {lastResult.deleted_fiches_transport_finisseurs_jours > 0 && <li>• Transport finisseurs jours : {lastResult.deleted_fiches_transport_finisseurs_jours}</li>}
                {lastResult.deleted_fiches_transport_finisseurs > 0 && <li>• Transport finisseurs : {lastResult.deleted_fiches_transport_finisseurs}</li>}
                {lastResult.deleted_fiches_transport_jours > 0 && <li>• Transport maçons jours : {lastResult.deleted_fiches_transport_jours}</li>}
                {lastResult.deleted_fiches_transport > 0 && <li>• Transport maçons : {lastResult.deleted_fiches_transport}</li>}
                {lastResult.deleted_affectations_finisseurs_jours > 0 && <li>• Affectations finisseurs : {lastResult.deleted_affectations_finisseurs_jours}</li>}
                {lastResult.deleted_affectations > 0 && <li>• Affectations maçons : {lastResult.deleted_affectations}</li>}
                {lastResult.deleted_fiches_jours > 0 && <li>• Fiches jours : {lastResult.deleted_fiches_jours}</li>}
                {lastResult.deleted_fiches > 0 && <li>• Fiches : {lastResult.deleted_fiches}</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
