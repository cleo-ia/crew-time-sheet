import { useAuth } from "@/contexts/AuthProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const { isOnline } = useAuth();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-2">
      <Alert variant="destructive" className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          Connexion perdue - tentative de reconnexion…
        </AlertDescription>
      </Alert>
    </div>
  );
}
