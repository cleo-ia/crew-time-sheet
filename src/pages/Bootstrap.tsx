import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

interface Entreprise {
  id: string;
  nom: string;
  slug: string;
  hasAdmin: boolean;
}

export default function Bootstrap() {
  const navigate = useNavigate();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEntreprises();
  }, []);

  const loadEntreprises = async () => {
    try {
      // Récupérer toutes les entreprises actives
      const { data: allEntreprises, error: entreprisesError } = await supabase
        .from('entreprises')
        .select('id, nom, slug')
        .eq('actif', true);

      if (entreprisesError) throw entreprisesError;

      // Afficher toutes les entreprises (pas de filtre sur hasAdmin)
      const entreprisesWithStatus = (allEntreprises || []).map(e => ({
        ...e,
        hasAdmin: false // On ne filtre plus
      }));
      
      setEntreprises(entreprisesWithStatus);
    } catch (error) {
      console.error('Error loading entreprises:', error);
      toast.error("Erreur lors du chargement des entreprises");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEntreprise || !email) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const entreprise = entreprises.find(e => e.slug === selectedEntreprise);
    if (!entreprise) {
      toast.error("Entreprise non trouvée");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M',
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            role: 'admin',
            entreprise_slug: selectedEntreprise,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création');
      }

      // Vérifier si c'était un ajout de rôle ou une nouvelle invitation
      if (result.mode === 'role_added') {
        toast.success(`Rôle admin ajouté pour ${email} sur ${entreprise.nom}`);
      } else {
        toast.success(`Invitation envoyée à ${email} pour ${entreprise.nom}`);
      }
      
      // Recharger les entreprises pour mettre à jour la liste
      loadEntreprises();
      setEmail("");
      setSelectedEntreprise("");
    } catch (error) {
      console.error('Bootstrap error:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'opération");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bootstrap Admin</CardTitle>
          <CardDescription>
            Créez ou ajoutez un rôle admin pour une entreprise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entreprise">Entreprise</Label>
              <Select value={selectedEntreprise} onValueChange={setSelectedEntreprise}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {entreprises.map((e) => (
                    <SelectItem key={e.slug} value={e.slug}>
                      {e.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email administrateur</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@groupe-engo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Doit être une adresse @groupe-engo.com
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer l'administrateur
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/auth')}
            >
              Retour à la connexion
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
