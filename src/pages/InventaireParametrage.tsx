import { AppNav } from "@/components/navigation/AppNav";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { InventoryTemplatesManager } from "@/components/admin/InventoryTemplatesManager";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const InventaireParametrage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <PageLayout>
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/validation-conducteur?tab=inventaire")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader title="Paramétrage inventaire" />
        </div>
        <InventoryTemplatesManager />
      </PageLayout>
    </div>
  );
};

export default InventaireParametrage;
