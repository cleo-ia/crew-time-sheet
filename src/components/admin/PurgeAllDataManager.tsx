import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const PurgeAllDataManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const queryClient = useQueryClient();

  const handlePurge = async () => {
    setIsLoading(true);
    setLastResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("purge-all-test-data", {
        body: {},
      });

      if (error) throw error;

      setLastResult(data);
      
      // Invalider toutes les queries pertinentes
      await queryClient.invalidateQueries({ queryKey: ["fiches"] });
      await queryClient.invalidateQueries({ queryKey: ["fiches-jours"] });
      await queryClient.invalidateQueries({ queryKey: ["fiches-transport"] });
      await queryClient.invalidateQueries({ queryKey: ["affectations-finisseurs"] });
      await queryClient.invalidateQueries({ queryKey: ["signatures"] });
      await queryClient.invalidateQueries({ queryKey: ["rh-data"] });
      await queryClient.invalidateQueries({ queryKey: ["rh-consolidated"] });
      
      // Dispatch event pour rafraîchir les autres composants
      window.dispatchEvent(new CustomEvent("data-purged"));
      
      toast.success("Purge complète effectuée", {
        description: `${data.totalDeleted || 0} enregistrements supprimés`,
      });
    } catch (err: any) {
      console.error("[PurgeAllDataManager] Error:", err);
      toast.error("Erreur lors de la purge", {
        description: err.message,
      });
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Purge complète des données de test
          </CardTitle>
          <CardDescription>
            Suppression de TOUTES les données de test dans la base de données
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              ⚠️ ATTENTION : Cette action est IRRÉVERSIBLE !
              <br />
              Toutes les données suivantes seront supprimées :
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Signatures</li>
                <li>Fiches transport finisseurs et leurs jours</li>
                <li>Fiches transport et leurs jours</li>
                <li>Affectations finisseurs</li>
                <li>Fiches jours</li>
                <li>Fiches</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Purge en cours...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Purger toutes les données
              </>
            )}
          </Button>

          {lastResult && (
            <Alert className="bg-muted">
              <AlertDescription>
                <div className="font-mono text-xs space-y-1">
                  <div className="font-bold text-sm mb-2">✅ Résultat de la purge :</div>
                  <div>Total supprimé : <span className="font-bold">{lastResult.totalDeleted}</span></div>
                  {lastResult.details && Object.entries(lastResult.details).map(([table, count]: [string, any]) => (
                    <div key={table}>• {table} : {count}</div>
                  ))}
                  {lastResult.verification && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="font-bold text-sm mb-1">Vérification :</div>
                      {Object.entries(lastResult.verification).map(([table, count]: [string, any]) => (
                        <div key={table}>• {table} restants : {count}</div>
                      ))}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la purge complète
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">
                Êtes-vous absolument certain de vouloir purger TOUTES les données de test ?
              </p>
              <p>
                Cette action supprimera de manière PERMANENTE et IRRÉVERSIBLE toutes les données 
                de test dans la base de données.
              </p>
              <p className="text-destructive font-medium">
                ⚠️ Il n'y a AUCUN moyen de récupérer ces données après suppression.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurge}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirmer la purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
