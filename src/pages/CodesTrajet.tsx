import { useState, useMemo } from "react";
import { AppNav } from "@/components/navigation/AppNav";
import { PageLayout } from "@/components/layout/PageLayout";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ROLE_COLORS: Record<string, string> = {
  chef: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  macon: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  grutier: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  finisseur: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const ROLE_LABELS: Record<string, string> = {
  chef: "Chef",
  macon: "Maçon",
  grutier: "Grutier",
  finisseur: "Finisseur",
};

// Codes trajet filtrés (sans AUCUN ni A_COMPLETER)
const TRAJET_OPTIONS = [
  { value: "AUCUN", label: "Aucun" },
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
        (c.code_chantier && c.code_chantier.toLowerCase().includes(s))
    );
  }, [chantiers, search]);

  const isLoading = loadingChantiers || loadingEmployes || loadingMappings;

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
      <PageLayout>
        <PageHeader
          title="Codes trajet par défaut"
          description="Définissez un code trajet par défaut pour chaque salarié sur chaque chantier."
        />

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un chantier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : activeChantiers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun chantier actif trouvé.
          </p>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {activeChantiers.map((chantier) => (
              <AccordionItem
                key={chantier.id}
                value={chantier.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <span className="font-semibold">{chantier.nom}</span>
                    {chantier.code_chantier && (
                      <Badge variant="outline" className="text-xs">
                        {chantier.code_chantier}
                      </Badge>
                    )}
                    {chantier.ville && (
                      <span className="text-xs text-muted-foreground">
                        {chantier.ville}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {!employes || employes.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-2">
                      Aucun employé terrain trouvé.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employé</TableHead>
                          <TableHead className="w-24">Rôle</TableHead>
                          <TableHead className="w-52">Code trajet</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employes.map((emp) => {
                          const key = `${chantier.id}_${emp.id}`;
                          const current = mappings?.get(key) ?? "AUCUN";
                          return (
                            <TableRow key={emp.id}>
                              <TableCell className="font-medium">
                                {emp.nom} {emp.prenom}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    ROLE_COLORS[emp.role_metier ?? ""] ?? ""
                                  }`}
                                >
                                  {ROLE_LABELS[emp.role_metier ?? ""] ??
                                    emp.role_metier}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={current}
                                  onValueChange={(v) =>
                                    handleChange(chantier.id, emp.id, v)
                                  }
                                >
                                  <SelectTrigger className="h-8 w-48">
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
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </PageLayout>
    </div>
  );
};

export default CodesTrajet;
