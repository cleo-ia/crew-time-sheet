import { useState, useMemo } from "react";
import { AppNav } from "@/components/navigation/AppNav";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useChantiers } from "@/hooks/useChantiers";
import {
  useEmployesTerrain,
  useCodesTrajetDefaut,
  useUpsertCodeTrajet,
} from "@/hooks/useCodesTrajetDefaut";
import { CODE_TRAJET_OPTIONS } from "@/types/transport";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Route, MapPin, Building2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ROLE_COLORS: Record<string, string> = {
  chef: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  macon: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  grutier: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  finisseur: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
};

const ROLE_LABELS: Record<string, string> = {
  chef: "Chef",
  macon: "Maçon",
  grutier: "Grutier",
  finisseur: "Finisseur",
};

// Codes trajet filtrés (sans AUCUN ni A_COMPLETER)
const TRAJET_OPTIONS = [
  { value: "AUCUN", label: "— Aucun —" },
  ...CODE_TRAJET_OPTIONS.filter(
    (o) => o.value !== "AUCUN" && o.value !== "A_COMPLETER"
  ),
];

const CodesTrajet = () => {
  const [search, setSearch] = useState("");
  const { data: chantiers, isLoading: loadingChantiers } = useChantiers();
  const { data: employes, isLoading: loadingEmployes } = useEmployesTerrain();
  const { data: mappings, isLoading: loadingMappings } = useCodesTrajetDefaut();
  const upsertMutation = useUpsertCodeTrajet();

  const activeChantiers = useMemo(() => {
    if (!chantiers) return [];
    const filtered = chantiers.filter((c) => c.actif);
    if (!search.trim()) return filtered;
    const s = search.toLowerCase();
    return filtered.filter(
      (c) =>
        c.nom.toLowerCase().includes(s) ||
        (c.code_chantier && c.code_chantier.toLowerCase().includes(s)) ||
        (c.ville && c.ville.toLowerCase().includes(s))
    );
  }, [chantiers, search]);

  const isLoading = loadingChantiers || loadingEmployes || loadingMappings;

  // Compter les codes définis par chantier
  const getDefinedCount = (chantierId: string) => {
    if (!mappings || !employes) return 0;
    return employes.filter((emp) => mappings.has(`${chantierId}_${emp.id}`)).length;
  };

  const handleChange = (
    chantierId: string,
    salarieId: string,
    value: string
  ) => {
    upsertMutation.mutate({
      chantierId,
      salarieId,
      codeTrajet: value === "AUCUN" ? null : value,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <PageHeader
        title="Codes trajet par défaut"
        subtitle="Définissez un code trajet par défaut pour chaque salarié sur chaque chantier"
        icon={Route}
        theme="consultation-rh"
      />
      <PageLayout>
        {/* Stats + Search bar */}
        <div className="flex items-center gap-3 mb-6 mt-4 flex-wrap">
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{activeChantiers.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">chantier{activeChantiers.length > 1 ? "s" : ""} actif{activeChantiers.length > 1 ? "s" : ""}</p>
            </div>
          </div>
          {employes && (
            <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{employes.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">employé{employes.length > 1 ? "s" : ""} terrain</p>
              </div>
            </div>
          )}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un chantier, ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : activeChantiers.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              Aucun chantier actif trouvé
            </p>
            {search && (
              <p className="text-sm text-muted-foreground mt-1">
                Essayez de modifier votre recherche
              </p>
            )}
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {activeChantiers.map((chantier) => {
              const definedCount = getDefinedCount(chantier.id);
              const totalCount = employes?.length ?? 0;
              
              return (
                <AccordionItem
                  key={chantier.id}
                  value={chantier.id}
                  className="border rounded-lg bg-card shadow-sm overflow-hidden"
                >
                  <AccordionTrigger className="hover:no-underline px-4 py-3">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-3 text-left">
                        <div className="h-8 w-1 rounded-full bg-primary/60 shrink-0" />
                        <div>
                          <span className="font-semibold text-foreground">
                            {chantier.nom}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {chantier.code_chantier && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono border-primary/30 text-primary"
                              >
                                {chantier.code_chantier}
                              </Badge>
                            )}
                            {chantier.ville && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {chantier.ville}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {totalCount > 0 && (
                        <Badge
                          variant={definedCount > 0 ? "default" : "secondary"}
                          className="text-xs shrink-0"
                        >
                          {definedCount}/{totalCount}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    {!employes || employes.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 px-4">
                        Aucun employé terrain trouvé.
                      </p>
                    ) : (
                      <div className="border-t">
                        {/* Header row */}
                        <div className="grid grid-cols-[1fr_100px_200px] gap-2 px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <span>Employé</span>
                          <span>Rôle</span>
                          <span>Code trajet</span>
                        </div>
                        {/* Employee rows */}
                        <div className="divide-y divide-border/50">
                          {employes.map((emp) => {
                            const key = `${chantier.id}_${emp.id}`;
                            const current = mappings?.get(key) ?? "AUCUN";
                            const hasCode = current !== "AUCUN";
                            
                            return (
                              <div
                                key={emp.id}
                                className={`grid grid-cols-[1fr_100px_200px] gap-2 px-4 py-2.5 items-center transition-colors hover:bg-muted/30 ${
                                  hasCode ? "bg-primary/[0.02]" : ""
                                }`}
                              >
                                <span className="text-sm font-medium text-foreground">
                                  {emp.nom}{" "}
                                  <span className="font-normal text-muted-foreground">
                                    {emp.prenom}
                                  </span>
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold w-fit ${
                                    ROLE_COLORS[emp.role_metier ?? ""] ?? ""
                                  }`}
                                >
                                  {ROLE_LABELS[emp.role_metier ?? ""] ??
                                    emp.role_metier}
                                </span>
                                <Select
                                  value={current}
                                  onValueChange={(v) =>
                                    handleChange(chantier.id, emp.id, v)
                                  }
                                >
                                  <SelectTrigger
                                    className={`h-8 text-xs ${
                                      hasCode
                                        ? "border-primary/30 bg-primary/5 font-medium"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="z-[100] bg-background">
                                    {TRAJET_OPTIONS.map((opt) => (
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                      >
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </PageLayout>
    </div>
  );
};

export default CodesTrajet;
