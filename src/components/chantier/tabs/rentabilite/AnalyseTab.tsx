import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { HelpCircle, Pencil, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useTachesChantier } from "@/hooks/useTachesChantier";

interface AnalyseTabProps {
  chantierId: string;
  montantVendu: number;
}

export const AnalyseTab = ({ chantierId, montantVendu }: AnalyseTabProps) => {
  const queryClient = useQueryClient();
  const { data: taches = [], isLoading: isLoadingTaches } = useTachesChantier(chantierId);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [venduInput, setVenduInput] = useState(montantVendu.toString());
  const [isSaving, setIsSaving] = useState(false);

  // Calculate totals from real tasks
  const totalHeuresEstimees = taches.reduce((sum, t) => sum + (t.heures_estimees ?? 0), 0);
  const totalHeuresRealisees = taches.reduce((sum, t) => sum + (t.heures_realisees ?? 0), 0);

  // Computed values (will be connected to real data later)
  const coutsValue = 0;
  const mainOeuvre = 0;
  const achats = 0;
  const sousTraitance = 0;
  const margeValue = montantVendu - coutsValue;
  const margePercent = montantVendu > 0 ? (margeValue / montantVendu) * 100 : 0;

  const donutData = [
    { name: "Marge", value: margePercent },
    { name: "Coûts", value: 100 - margePercent },
  ];

  const handleSaveVendu = async () => {
    const newValue = parseFloat(venduInput.replace(/\s/g, "").replace(",", ".")) || 0;
    setIsSaving(true);
    
    const { error } = await supabase
      .from("chantiers")
      .update({ montant_vendu: newValue })
      .eq("id", chantierId);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    } else {
      toast.success("Montant vendu mis à jour");
      queryClient.invalidateQueries({ queryKey: ["chantier-detail", chantierId] });
      setIsPopoverOpen(false);
    }
    setIsSaving(false);
  };

  const handlePopoverOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);
    if (open) {
      setVenduInput(montantVendu.toString());
    }
  };

  return (
    <div className="space-y-6">
      {/* Top section: Single card with Donut + KPIs + Costs */}
      <Card>
        <CardContent className="py-8 px-10">
          <div className="flex items-center gap-12">
            {/* Donut Chart */}
            <div className="flex-shrink-0">
              <div className="h-[220px] w-[220px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                    >
                      <Cell fill="hsl(142, 76%, 36%)" />
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-green-600">{margePercent.toFixed(2)}%</span>
                  <span className="text-sm text-muted-foreground">de marge</span>
                </div>
              </div>
            </div>

            {/* KPIs Grid */}
            <div className="flex-1 grid grid-cols-3 gap-12">
              {/* MARGE Column */}
              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {margeValue.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">MARGE</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">{mainOeuvre.toLocaleString("fr-FR")}€</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="w-3 h-3 rounded-full bg-gray-400" />
                    <span>MAIN D'OEUVRE</span>
                    <HelpCircle className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* VENDU Column */}
              <div className="space-y-6">
                <div>
                  <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
                    <PopoverTrigger asChild>
                      <div className="group cursor-pointer inline-flex items-center gap-2">
                        <p className="text-3xl font-bold hover:text-primary transition-colors">
                          €{montantVendu.toLocaleString("fr-FR")}
                        </p>
                        <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Modifier le montant vendu</p>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">€</span>
                          <Input
                            type="text"
                            value={venduInput}
                            onChange={(e) => setVenduInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveVendu();
                              if (e.key === "Escape") setIsPopoverOpen(false);
                            }}
                            className="flex-1"
                            autoFocus
                          />
                          <Button 
                            size="icon" 
                            onClick={handleSaveVendu} 
                            disabled={isSaving}
                            className="shrink-0"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">VENDU</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">{achats.toLocaleString("fr-FR")}€</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>ACHATS</span>
                    <HelpCircle className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* COÛTS Column */}
              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-bold text-destructive">
                    {coutsValue.toLocaleString("fr-FR")}€
                  </p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">COÛTS</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">{sousTraitance.toLocaleString("fr-FR")}€</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span>SOUS TRAITANCE</span>
                    <HelpCircle className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks table */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4">Par tâche</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tâches</TableHead>
                <TableHead className="text-right">Heures estimées</TableHead>
                <TableHead className="text-right">Heures travaillées</TableHead>
                <TableHead className="text-right">Marge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTaches ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : taches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Aucune tâche définie
                  </TableCell>
                </TableRow>
              ) : (
                taches.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.nom}</TableCell>
                    <TableCell className="text-right">{task.heures_estimees ?? 0}h</TableCell>
                    <TableCell className="text-right">{task.heures_realisees ?? 0}h</TableCell>
                    <TableCell className="text-right text-muted-foreground">0€</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {taches.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{totalHeuresEstimees}h</TableCell>
                  <TableCell className="text-right font-semibold">{totalHeuresRealisees}h</TableCell>
                  <TableCell className="text-right font-semibold text-muted-foreground">0€</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
