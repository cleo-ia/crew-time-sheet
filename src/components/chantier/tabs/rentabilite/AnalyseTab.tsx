import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const mockTasks = [
  { nom: "Fondations", heuresEstimees: 120, heuresTravaillees: 98, marge: 2450 },
  { nom: "Gros œuvre", heuresEstimees: 340, heuresTravaillees: 312, marge: 8200 },
  { nom: "Charpente", heuresEstimees: 80, heuresTravaillees: 75, marge: 1800 },
  { nom: "Couverture", heuresEstimees: 60, heuresTravaillees: 58, marge: 1200 },
  { nom: "Menuiseries", heuresEstimees: 45, heuresTravaillees: 42, marge: 980 },
];

const margePercent = 23.45;
const donutData = [
  { name: "Marge", value: margePercent },
  { name: "Coûts", value: 100 - margePercent },
];

export const AnalyseTab = () => {
  return (
    <div className="space-y-6">
      {/* Top section: Donut + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <Card>
          <CardContent className="pt-6">
            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                  >
                    <Cell fill="hsl(var(--primary))" />
                    <Cell fill="hsl(var(--muted))" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{margePercent}%</span>
              </div>
            </div>
            <p className="text-center text-muted-foreground mt-2">Marge globale</p>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">MARGE</p>
              <p className="text-2xl font-bold text-primary mt-1">54 232€</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">VENDU</p>
              <p className="text-2xl font-bold mt-1">287 000€</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">COÛTS</p>
              <p className="text-2xl font-bold text-destructive mt-1">232 768€</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cost breakdown */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground">Répartition des coûts</h3>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Main d'œuvre</span>
                <span className="font-medium">45 700€</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "20%" }} />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Achats</span>
                <span className="font-medium">168 000€</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: "72%" }} />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Sous-traitance</span>
                <span className="font-medium">19 068€</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: "8%" }} />
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
