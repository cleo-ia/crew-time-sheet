import { useAuth } from "@/contexts/AuthProvider";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkStatusBadgeProps {
  className?: string;
  showWhenOnline?: boolean;
}

export function NetworkStatusBadge({ className, showWhenOnline = false }: NetworkStatusBadgeProps) {
  const { isOnline } = useAuth();

  // Si en ligne et qu'on ne veut pas afficher, ne rien rendre
  if (isOnline && !showWhenOnline) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
        isOnline
          ? "bg-success/10 text-success border border-success/20"
          : "bg-destructive/10 text-destructive border border-destructive/30 animate-pulse",
        className
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>En ligne</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Hors ligne</span>
        </>
      )}
    </div>
  );
}
