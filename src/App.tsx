import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import { LabOwnerDashboard } from "@/components/dashboard/LabOwnerDashboard";
import LabMembers from "./pages/LabMembers";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { CreateExperiment } from "./pages/CreateExperiment";
import Experiments from "./pages/Experiments";
import Messages from "./pages/Messages";
import Admin from "./pages/Admin";
import Labs from "./pages/Labs";
import ExperimentDetails from "./pages/ExperimentDetails";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/lab-owner" element={<LabOwnerDashboard />} />
            <Route path="/lab-members" element={<LabMembers />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/experiments/create" element={<CreateExperiment />} />
            <Route path="/experiments/:id" element={<ExperimentDetails />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/labs" element={<Labs />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
