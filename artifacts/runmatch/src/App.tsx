import {
  ClerkProvider,
  SignIn,
  SignUp,
  useAuth,
  useClerk,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  Redirect,
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
} from "wouter";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGate } from "@/components/auth-gate";
import {
  getArtifactRoutePath,
  normalizeArtifactBasePath,
} from "@/lib/auth-paths";
import {
  applyPageMetadata,
  getPublicPageMetadata,
} from "@/lib/seo";
import { useIdentity } from "@/hooks/use-identity";
import { useUnreadMessageUpdates } from "@/hooks/use-unread-message-updates";
import ConversationPage from "@/pages/conversation";
import CreateProfile from "@/pages/create-profile";
import EditRunnerProfile from "@/pages/edit-runner-profile";
import Home from "@/pages/home";
import Inbox from "@/pages/inbox";
import NotFound from "@/pages/not-found";
import RunBuddy from "@/pages/run-buddy";
import RunDate from "@/pages/run-date";
import RunnerProfile from "@/pages/runner-profile";

const basePath = normalizeArtifactBasePath(import.meta.env.BASE_URL);

// Required: resolve the key from the hostname so the same build works on
// custom domains and on the Replit preview host.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// Required: empty in development and populated automatically in production.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#B2E119",
    colorForeground: "#162236",
    colorMutedForeground: "#667084",
    colorDanger: "#D22628",
    colorBackground: "#FDFCF8",
    colorInput: "#F8F5EC",
    colorInputForeground: "#162236",
    colorNeutral: "#E3DDD0",
    fontFamily: "Manrope, sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#fdfcf8] rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#162236] font-display font-bold",
    headerSubtitle: "text-[#667084]",
    dividerRow: "!hidden",
    socialButtonsBlockButton: "!hidden",
    socialButtonsBlockButtonText: "!hidden",
    formFieldLabel: "text-[#162236]",
    footerActionLink: "text-[#162236] underline-offset-4 hover:underline",
    footerActionText: "text-[#667084]",
    dividerText: "text-[#667084]",
    identityPreviewEditButton: "text-[#162236]",
    formFieldSuccessText: "text-emerald-700",
    alertText: "text-[#162236]",
    logoBox: "mb-5",
    logoImage: "max-h-10",
    formButtonPrimary:
      "rounded-xl bg-[#b2e119] text-[#162236] hover:bg-[#9ecb12]",
    formFieldInput:
      "rounded-xl border-[#e3ddd0] bg-[#f8f5ec] text-[#162236]",
    footerAction: "text-[#667084]",
    dividerLine: "bg-[#e3ddd0]",
    alert: "rounded-xl border-red-200 bg-red-50",
    otpCodeFieldInput:
      "rounded-xl border-[#e3ddd0] bg-[#f8f5ec] text-[#162236]",
    formFieldRow: "mb-4",
    main: "text-[#162236]",
  },
};

const queryClient = new QueryClient();
const clerkUserIdSessionKey = "runbuddy.clerk-user-id";
const crossTabAuthReloadSessionKey = "runbuddy.cross-tab-auth-reload";

function PublicRouteMetadata() {
  const [location] = useLocation();

  useEffect(() => {
    const metadata = getPublicPageMetadata(location);

    if (!metadata) {
      return;
    }

    applyPageMetadata(metadata);
  }, [location]);

  return null;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth({
    treatPendingAsSignedOut: false,
  });
  if (isLoaded && isSignedIn === true) {
    return <Redirect to="/run-buddy" />;
  }
  return <Home />;
}

function SignInPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <SignIn
        routing="path"
        path={getArtifactRoutePath(basePath, "sign-in")}
        signUpUrl={getArtifactRoutePath(basePath, "sign-up")}
      />
    </main>
  );
}

function SignUpPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <SignUp
        routing="path"
        path={getArtifactRoutePath(basePath, "sign-up")}
        signInUrl={getArtifactRoutePath(basePath, "sign-in")}
      />
    </main>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/run-buddy" component={RunBuddy} />
      <Route path="/run-date" component={RunDate} />
      <Route path="/edit-profile/:id">
        <AuthGate basePath={basePath}>
          <EditRunnerProfile />
        </AuthGate>
      </Route>
      <Route path="/runner/:id" component={RunnerProfile} />
      <Route path="/create-profile">
        <AuthGate basePath={basePath}>
          <CreateProfile />
        </AuthGate>
      </Route>
      <Route path="/inbox">
        <AuthGate basePath={basePath}>
          <Inbox />
        </AuthGate>
      </Route>
      <Route path="/messages/:otherId">
        <AuthGate basePath={basePath}>
          <ConversationPage />
        </AuthGate>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const { isLoaded, isSignedIn, userId } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const { myRunnerId } = useIdentity();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useUnreadMessageUpdates(
    userId,
    isLoaded && isSignedIn === true && myRunnerId !== null,
  );

  useEffect(() => {
    const authStateChannel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("runbuddy-auth-state");
    const isReloadingFromCrossTabAuthChange =
      sessionStorage.getItem(crossTabAuthReloadSessionKey) === "true";
    sessionStorage.removeItem(crossTabAuthReloadSessionKey);
    const handleCrossTabAuthChange = (event: MessageEvent) => {
      if (event.data !== "user-changed") {
        return;
      }

      queryClient.clear();
      sessionStorage.setItem(crossTabAuthReloadSessionKey, "true");
      window.location.reload();
    };
    authStateChannel?.addEventListener("message", handleCrossTabAuthChange);

    const unsubscribe = addListener(({ user }) => {
      if (user === undefined) {
        return;
      }

      const userId = user?.id ?? null;
      const sessionUserId = sessionStorage.getItem(clerkUserIdSessionKey);
      const previousAccountChanged =
        previousUserId.current === undefined
          ? sessionUserId !== null && sessionUserId !== (userId ?? "")
          : previousUserId.current !== userId;
      const shouldSuppressInitialBroadcast =
        previousUserId.current === undefined &&
        isReloadingFromCrossTabAuthChange;

      if (
        previousAccountChanged &&
        userId !== null &&
        !shouldSuppressInitialBroadcast
      ) {
        queryClient.clear();
        authStateChannel?.postMessage("user-changed");
      }

      previousUserId.current = userId;
      sessionStorage.setItem(clerkUserIdSessionKey, userId ?? "");
    });

    return () => {
      unsubscribe();
      authStateChannel?.removeEventListener("message", handleCrossTabAuthChange);
      authStateChannel?.close();
    };
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [location, setLocation] = useLocation();
  const hideMobileNav =
    location.startsWith("/sign-in") || location.startsWith("/sign-up");

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back to RunBuddy",
            subtitle: "Sign in to find your running community.",
          },
        },
        signUp: {
          start: {
            title: "Join RunBuddy",
            subtitle: "Create an account to meet runners wherever you go.",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <PublicRouteMetadata />
          <div className="pb-16 md:pb-0">
            <Router />
          </div>
          {!hideMobileNav && <MobileNav />}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
