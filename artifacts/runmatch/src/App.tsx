import { Switch, Route, Router as WouterRouter } from "wouter";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/run-date" component={RunDate} />
      <Route path="/run-buddy" component={RunBuddy} />
      <Route path="/runner/:id" component={RunnerProfile} />
      <Route path="/create-profile" component={CreateProfile} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/messages/:otherId" component={ConversationPage} />
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
