import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import AuthProvider from "@/contexts/AuthProvider";
import InstallPWA from "@/components/pwa/InstallPWA";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import Index from "./pages/Index";
import ValidationConducteur from "./pages/ValidationConducteur";
import ConsultationRH from "./pages/ConsultationRH";
import SignatureMacons from "./pages/SignatureMacons";
import SignatureFinisseurs from "./pages/SignatureFinisseurs";
import AdminPanel from "./pages/AdminPanel";
import ChantierDetail from "./pages/ChantierDetail";
import ChantiersPage from "./pages/ChantiersPage";
import RapprochementInterim from "./pages/RapprochementInterim";
import PlanningMainOeuvre from "./pages/PlanningMainOeuvre";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import Bootstrap from "./pages/Bootstrap";
import NotFound from "./pages/NotFound";
import Documentation from "./pages/Documentation";
import RequireAuth from "./components/auth/RequireAuth";
import { RequireRole } from "./components/auth/RequireRole";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPWA />
        <AuthProvider>
          <ErrorBoundary>
            <BrowserRouter>
          <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/bootstrap" element={<Bootstrap />} />
          <Route path="/install" element={<Install />} />
          <Route element={<RequireAuth />}>
            {/* Saisie Chef - Accessible par: super_admin, chef */}
            <Route 
              path="/" 
              element={
                <RequireRole allowedRoles={["super_admin", "chef"]}>
                  <Index />
                </RequireRole>
              } 
            />
            
            {/* Redirection pour ancienne route */}
            <Route 
              path="/saisie-conducteur" 
              element={<Navigate to="/validation-conducteur" replace />}
            />
            
            {/* Validation Conducteur - Accessible par: super_admin, conducteur */}
            <Route 
              path="/validation-conducteur" 
              element={
                <RequireRole allowedRoles={["super_admin", "conducteur"]}>
                  <ValidationConducteur />
                </RequireRole>
              } 
            />
            
            {/* Consultation RH - Accessible par: super_admin, rh */}
            <Route 
              path="/consultation-rh" 
              element={
                <RequireRole allowedRoles={["super_admin", "rh"]}>
                  <ConsultationRH />
                </RequireRole>
              } 
            />
            
            {/* Signature Maçons - Accessible par tous les authentifiés */}
            <Route path="/signature-macons" element={<SignatureMacons />} />
            
            {/* Documentation - Accessible par tous les authentifiés */}
            <Route path="/documentation" element={<Documentation />} />
            
            {/* Signature Finisseurs - Accessible par: super_admin, conducteur */}
            <Route 
              path="/signature-finisseurs" 
              element={
                <RequireRole allowedRoles={["super_admin", "conducteur"]}>
                  <SignatureFinisseurs />
                </RequireRole>
              } 
            />

            {/* Planning Main d'Oeuvre - Accessible par: super_admin, conducteur, admin */}
            <Route 
              path="/planning-main-oeuvre" 
              element={
                <RequireRole allowedRoles={["super_admin", "conducteur", "admin"]}>
                  <PlanningMainOeuvre />
                </RequireRole>
              } 
            />

            {/* Chantiers - Accessible par: super_admin, conducteur */}
            <Route 
              path="/chantiers" 
              element={
                <RequireRole allowedRoles={["super_admin", "conducteur"]}>
                  <ChantiersPage />
                </RequireRole>
              } 
            />
            
            {/* Chantier Detail - Accessible par: super_admin, conducteur, chef (lecture seule pour chef) */}
            <Route 
              path="/chantiers/:id" 
              element={
                <RequireRole allowedRoles={["super_admin", "conducteur", "chef"]}>
                  <ChantierDetail />
                </RequireRole>
              } 
            />
            
            {/* Rapprochement Intérimaires - Accessible par: super_admin, gestionnaire (SDER) */}
            <Route 
              path="/rapprochement-interim" 
              element={
                <RequireRole allowedRoles={["super_admin", "gestionnaire"]}>
                  <RapprochementInterim />
                </RequireRole>
              } 
            />

            {/* Admin Panel - Accessible par: super_admin, admin, gestionnaire */}
            <Route 
              path="/admin" 
              element={
                <RequireRole allowedRoles={["super_admin", "admin", "gestionnaire", "rh"]}>
                  <AdminPanel />
                </RequireRole>
              } 
            />
            {/* Chantier Detail - Accessible par: super_admin, admin, gestionnaire */}
            <Route 
              path="/admin/chantiers/:id" 
              element={
                <RequireRole allowedRoles={["super_admin", "admin", "gestionnaire", "rh"]}>
                  <ChantierDetail />
                </RequireRole>
              } 
            />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
