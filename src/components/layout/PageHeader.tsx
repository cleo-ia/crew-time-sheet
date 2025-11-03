import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  theme: "saisie-chef" | "validation-conducteur" | "consultation-rh" | "admin";
  actions?: ReactNode;
}

export const PageHeader = ({ title, subtitle, icon: Icon, theme, actions }: PageHeaderProps) => {
  return (
    <header 
      className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm"
      style={{
        backgroundColor: `hsl(var(--theme-${theme}) / 0.4)`,
      }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 
              className="text-2xl font-bold flex items-center gap-2"
              style={{ color: `hsl(var(--theme-${theme}-foreground))` }}
            >
              <Icon className="h-6 w-6" />
              {title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
};
