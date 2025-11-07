import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Loader2, AlertTriangle, Bomb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";


export const TransportDebugManager = () => {
  const [semaine, setSemaine] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  
  const [isPurgingAll, setIsPurgingAll] = useState(false);
  const [purgeAllResult, setPurgeAllResult] = useState<any>(null);
  
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


  const handlePurgeAll = async () => {
    const confirmed = window.confirm(
      "⚠️ ATTENTION : Cette action va SUPPRIMER TOUTES les données de test (fiches, signatures, transport, affectations, etc.).\n\nCette action est IRRÉVERSIBLE.\n\nÊtes-vous absolument certain de vouloir continuer ?"
    );

    if (!confirmed) return;

    setIsPurgingAll(true);
    setPurgeAllResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("purge-all-test-data");

      if (error) throw error;

      setPurgeAllResult(data);
      
      // Invalider TOUTES les queries pour forcer un rechargement complet
      await queryClient.invalidateQueries();

      toast.success(
        `Purge complète réussie : ${data.total} enregistrements supprimés`,
        { 
          description: "Toutes les données de test ont été effacées. Rechargez la page.",
          duration: 8000,
        }
      );
    } catch (err: any) {
      console.error("[TransportDebugManager] Purge all error:", err);
      toast.error("Erreur lors de la purge complète", {
        description: err.message || "Vérifiez les logs de la fonction",
      });
    } finally {
      setIsPurgingAll(false);
    }
  };


  return (
    <div className="space-y-4">

      {/* Carte 1: Purge complète */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Bomb className="h-5 w-5" />
            DANGER - Purge Complète de Toutes les Données
          </CardTitle>
          <CardDescription>
            Supprime TOUTES les données de test : fiches, signatures, transport, affectations (maçons et finisseurs).
            <strong className="text-destructive"> Action irréversible.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>⚠️ ATTENTION EXTRÊME :</strong> Cette action supprime TOUTES les données de test de l'application :
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>Toutes les fiches et fiches_jours</li>
                <li>Toutes les signatures</li>
                <li>Tous les transports (chefs/maçons et finisseurs)</li>
                <li>Toutes les affectations (maçons et finisseurs)</li>
              </ul>
              <p className="mt-2 font-bold">Cette action est IRRÉVERSIBLE et ne peut pas être annulée.</p>
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handlePurgeAll} 
            disabled={isPurgingAll}
            variant="destructive"
            className="w-full"
          >
            {isPurgingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Purge en cours...
              </>
            ) : (
              <>
                <Bomb className="h-4 w-4 mr-2" />
                PURGER TOUTES LES DONNÉES DE TEST
              </>
            )}
          </Button>

          {purgeAllResult && (
            <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <AlertDescription className="text-sm">
                <strong>✓ Purge complète réussie :</strong>
                <ul className="mt-2 space-y-1">
                  <li>📝 Signatures : {purgeAllResult.deleted?.signatures || 0}</li>
                  <li>🚗 Transport finisseurs (jours) : {purgeAllResult.deleted?.fiches_transport_finisseurs_jours || 0}</li>
                  <li>🚗 Transport finisseurs : {purgeAllResult.deleted?.fiches_transport_finisseurs || 0}</li>
                  <li>🚗 Transport jours : {purgeAllResult.deleted?.fiches_transport_jours || 0}</li>
                  <li>🚗 Transport : {purgeAllResult.deleted?.fiches_transport || 0}</li>
                  <li>👷 Affectations maçons : {purgeAllResult.deleted?.affectations || 0}</li>
                  <li>🎨 Affectations finisseurs : {purgeAllResult.deleted?.affectations_finisseurs_jours || 0}</li>
                  <li>📄 Fiches jours : {purgeAllResult.deleted?.fiches_jours || 0}</li>
                  <li>📋 Fiches : {purgeAllResult.deleted?.fiches || 0}</li>
                  <li className="font-bold pt-2 border-t">Total : {purgeAllResult.total} enregistrements</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Carte 2: Purge transport semaine */}
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
