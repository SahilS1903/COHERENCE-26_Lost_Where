import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import LeadTracker from "./pages/LeadTracker";
import OutboxMonitor from "./pages/OutboxMonitor";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider, useAuth } from "./components/AuthProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // Or a spinner

  if (!user && !localStorage.getItem("auth_token")) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workflows/new" element={<WorkflowBuilder />} />
              <Route path="/leads" element={<LeadTracker />} />
              <Route path="/outbox" element={<OutboxMonitor />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
