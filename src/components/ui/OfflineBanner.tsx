import { useAuth } from "@/contexts/AuthProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflineBanner() {
  const { isOnline } = useAuth();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-2 animate-in slide-in-from-top duration-300">
      <Alert variant="destructive" className="flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="animate-pulse">
            <WifiOff className="h-4 w-4" />
          </div>
          <AlertDescription className="font-medium">
            Connexion perdue — Les modifications ne seront pas sauvegardées
          </AlertDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.reload()}
          className="shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <RefreshCw className="h-3 w-3" />
          Recharger
        </Button>
      </Alert>
    </div>
  );
}
