import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { HelpCircle } from "lucide-react";

const mockTasks = [
  { nom: "Fondations", heuresEstimees: 120, heuresTravaillees: 98, marge: 2450 },
  { nom: "Gros œuvre", heuresEstimees: 340, heuresTravaillees: 312, marge: 8200 },
  { nom: "Charpente", heuresEstimees: 80, heuresTravaillees: 75, marge: 1800 },
  { nom: "Couverture", heuresEstimees: 60, heuresTravaillees: 58, marge: 1200 },
  { nom: "Menuiseries", heuresEstimees: 45, heuresTravaillees: 42, marge: 980 },
];

// Mock data - all set to zero
const margePercent = 0;
const margeValue = 0;
const venduValue = 0;
const coutsValue = 0;
const mainOeuvre = 0;
const achats = 0;
const sousTraitance = 0;

const donutData = [
  { name: "Marge", value: margePercent },
  { name: "Coûts", value: 100 - margePercent },
];

export const AnalyseTab = () => {
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
                  <p className="text-3xl font-bold">
                    €{venduValue.toLocaleString("fr-FR")}
                  </p>
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
              {mockTasks.map((task) => (
                <TableRow key={task.nom}>
                  <TableCell className="font-medium">{task.nom}</TableCell>
                  <TableCell className="text-right">{task.heuresEstimees}h</TableCell>
                  <TableCell className="text-right">{task.heuresTravaillees}h</TableCell>
                  <TableCell className="text-right text-primary font-medium">
                    {task.marge.toLocaleString()}€
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
