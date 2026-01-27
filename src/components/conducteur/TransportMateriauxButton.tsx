import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { TransportMateriauxSheet } from "./TransportMateriauxSheet";

interface TransportMateriauxButtonProps {
  conducteurId: string;
}

export const TransportMateriauxButton = ({ conducteurId }: TransportMateriauxButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <Package className="h-4 w-4" />
        Transport matériaux
      </Button>

      <TransportMateriauxSheet
        open={open}
        onOpenChange={setOpen}
        conducteurId={conducteurId}
      />
    </>
  );
};
