import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const PurgeAllTestData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handlePurge = async () => {
    if (!confirm("⚠️ ATTENTION: Cette action va supprimer TOUTES les données de test de la base de données. Êtes-vous sûr ?")) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("purge-all-test-data");

      if (error) throw error;

      setResult(data);
      toast.success("Purge effectuée avec succès", {
        description: `${data.totalDeleted || 0} enregistrement(s) supprimé(s)`
      });
    } catch (err: any) {
      console.error("[PurgeAllTestData] Error:", err);
      toast.error("Erreur lors de la purge", {
        description: err.message
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
          Purge Totale des Données de Test
        </CardTitle>
        <CardDescription>
          Supprime TOUTES les données de test de la base de données (fiches, signatures, transport, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action irréversible !</strong> Cette opération supprimera toutes les données créées après 1900-01-01.
          </AlertDescription>
        </Alert>

        <Button 
          variant="destructive" 
          onClick={handlePurge}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Purge en cours..." : "Purger toutes les données de test"}
        </Button>

        {result && (
          <Alert>
            <AlertDescription className="space-y-2">
              <p className="font-semibold">Résultat de la purge :</p>
              <ul className="text-sm space-y-1">
                <li>• Signatures: {result.deleted?.signatures || 0}</li>
                <li>• Fiches transport finisseurs jours: {result.deleted?.fiches_transport_finisseurs_jours || 0}</li>
                <li>• Fiches transport finisseurs: {result.deleted?.fiches_transport_finisseurs || 0}</li>
                <li>• Fiches transport jours: {result.deleted?.fiches_transport_jours || 0}</li>
                <li>• Fiches transport: {result.deleted?.fiches_transport || 0}</li>
                <li>• Affectations finisseurs jours: {result.deleted?.affectations_finisseurs_jours || 0}</li>
                <li>• Fiches jours: {result.deleted?.fiches_jours || 0}</li>
                <li>• Fiches: {result.deleted?.fiches || 0}</li>
              </ul>
              <p className="font-bold">Total: {result.totalDeleted || 0} enregistrement(s) supprimé(s)</p>
              {result.verification && (
                <div className="mt-2 text-xs">
                  <p>Vérification finale:</p>
                  <ul>
                    <li>• Fiches restantes: {result.verification.fiches_remaining || 0}</li>
                    <li>• Fiches jours restantes: {result.verification.fiches_jours_remaining || 0}</li>
                    <li>• Signatures restantes: {result.verification.signatures_remaining || 0}</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
