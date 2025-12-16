import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { WifiOff, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface OfflineOverlayProps {
  children: ReactNode;
  message?: string;
}

export function OfflineOverlay({ 
  children, 
  message = "La saisie est désactivée jusqu'au retour de la connexion" 
}: OfflineOverlayProps) {
  const { isOnline } = useAuth();

  return (
    <div className="relative">
      {children}
      
      {!isOnline && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center rounded-lg">
          <Card className="p-6 text-center max-w-sm mx-4 shadow-lg border-destructive/20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Connexion perdue
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {message}
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer la connexion
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
