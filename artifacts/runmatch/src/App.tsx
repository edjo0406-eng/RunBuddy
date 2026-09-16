import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileNav } from "@/components/layout/MobileNav";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import RunDate from "@/pages/run-date";
import RunBuddy from "@/pages/run-buddy";
import RunnerProfile from "@/pages/runner-profile";
import CreateProfile from "@/pages/create-profile";
import Inbox from "@/pages/inbox";
import ConversationPage from "@/pages/conversation";
import { useAuth } from "@workspace/replit-auth-web";

function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-3xl font-display font-bold">Sign in to RunBuddy</h1>
          <p className="mb-6 text-muted-foreground">
            Sign in to browse profiles and use private connections and messages.
          </p>
          <button
            type="button"
            onClick={login}
            className="rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function LoginRedirect() {
  useEffect(() => {
    window.location.replace("/api/login?returnTo=%2F");
  }, []);

  return <div className="min-h-screen bg-background" />;
}

function CallbackRedirect() {
  useEffect(() => {
    window.location.replace(`/api/callback${window.location.search}`);
  }, []);

  return <div className="min-h-screen bg-background" />;
}

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/run-date" component={RunDate} />
      <Route path="/run-buddy" component={RunBuddy} />
      <Route path="/runner/:id" component={RunnerProfile} />
      <Route path="/login" component={LoginRedirect} />
      <Route path="/callback" component={CallbackRedirect} />
      <Route path="/create-profile">
        <AuthGate>
          <CreateProfile />
        </AuthGate>
      </Route>
      <Route path="/inbox">
        <AuthGate>
          <Inbox />
        </AuthGate>
      </Route>
      <Route path="/messages/:otherId">
        <AuthGate>
          <ConversationPage />
        </AuthGate>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="pb-16 md:pb-0">
            <Router />
          </div>
          <MobileNav />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
