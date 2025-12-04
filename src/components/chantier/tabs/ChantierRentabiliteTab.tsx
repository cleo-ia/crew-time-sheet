import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyseTab } from "./rentabilite/AnalyseTab";
import { AchatsTab } from "./rentabilite/AchatsTab";
import { HeuresTab } from "./rentabilite/HeuresTab";

interface ChantierRentabiliteTabProps {
  chantierId: string;
  montantVendu: number;
}

export const ChantierRentabiliteTab = ({ chantierId, montantVendu }: ChantierRentabiliteTabProps) => {
  return (
    <Tabs defaultValue="analyse" className="w-full">
      <TabsList>
        <TabsTrigger value="analyse">Analyse</TabsTrigger>
        <TabsTrigger value="achats">Achats</TabsTrigger>
        <TabsTrigger value="heures">Heures</TabsTrigger>
      </TabsList>

      <div className="mt-4">
        <TabsContent value="analyse">
          <AnalyseTab chantierId={chantierId} montantVendu={montantVendu} />
        </TabsContent>
        <TabsContent value="achats">
          <AchatsTab chantierId={chantierId} />
        </TabsContent>
        <TabsContent value="heures">
          <HeuresTab />
        </TabsContent>
      </div>
    </Tabs>
  );
};
