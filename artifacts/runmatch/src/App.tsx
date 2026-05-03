import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import RunDate from "@/pages/run-date";
import RunBuddy from "@/pages/run-buddy";
import RunnerProfile from "@/pages/runner-profile";
import CreateProfile from "@/pages/create-profile";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/run-date" component={RunDate} />
      <Route path="/run-buddy" component={RunBuddy} />
      <Route path="/runner/:id" component={RunnerProfile} />
      <Route path="/create-profile" component={CreateProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
