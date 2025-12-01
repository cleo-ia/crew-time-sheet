import { Card } from "@/components/ui/card";
import { Clock, TrendingUp, UserX, Building2, Users, Route } from "lucide-react";
import { useRHSummary } from "@/hooks/useRHData";
import { Skeleton } from "@/components/ui/skeleton";

interface RHSummaryProps {
  filters: any;
}

export const RHSummary = ({ filters }: RHSummaryProps) => {
  const { data: summary, isLoading } = useRHSummary(filters);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  const trajetsACompleter = summary?.trajetsACompleter || 0;
  
  const stats = [
    {
      label: "Heures normales",
      value: `${summary?.heuresNormales || 0}h`,
      icon: Clock,
      color: "text-primary",
    },
    {
      label: "Heures supplémentaires",
      value: `${summary?.heuresSupp || 0}h`,
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      label: "Absences",
      value: `${summary?.absences || 0}j`,
      icon: UserX,
      color: "text-warning",
    },
    {
      label: "Chantiers",
      value: summary?.chantiers || 0,
      icon: Building2,
      color: "text-primary",
    },
    {
      label: "Salariés",
      value: summary?.salaries || 0,
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Trajets à compléter",
      value: trajetsACompleter,
      icon: Route,
      color: trajetsACompleter > 0 ? "text-orange-500" : "text-muted-foreground",
      bgColor: trajetsACompleter > 0 ? "bg-orange-100 dark:bg-orange-950" : undefined,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className={`p-4 shadow-md border-border/50 ${stat.bgColor || ''}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor ? 'bg-orange-200 dark:bg-orange-900' : 'bg-muted/50'} ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
