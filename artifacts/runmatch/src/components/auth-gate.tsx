import type { ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { trackEvent } from "@/lib/analytics";
import { getArtifactRoutePath } from "@/lib/auth-paths";

export function AuthGate({
  children,
  basePath,
}: {
  children: ReactNode;
  basePath: string;
}) {
  const { isLoaded, isSignedIn } = useAuth({
    treatPendingAsSignedOut: false,
  });

  if (!isLoaded || isSignedIn === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div
          role="status"
          aria-live="polite"
          className="max-w-md text-center"
        >
          <h1 className="mb-3 text-3xl font-display font-bold">
            Checking your RunBuddy session
          </h1>
          <p className="mb-6 text-muted-foreground">
            Private pages stay protected while we confirm your account. You can
            retry the check or continue to the public runner directory.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              data-testid="button-retry-session-check"
              onClick={() => window.location.reload()}
              className="inline-flex rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground"
            >
              Try again
            </button>
            <a
              href={getArtifactRoutePath(basePath, "run-buddy")}
              className="inline-flex rounded-full border border-border px-5 py-3 font-bold text-foreground"
            >
              Browse public RunBuddy
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isSignedIn === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-3xl font-display font-bold">Sign in to RunBuddy</h1>
          <p className="mb-6 text-muted-foreground">
            Sign in to browse profiles and use private connections and messages.
          </p>
          <a
            href={getArtifactRoutePath(basePath, "sign-in")}
            onClick={() => trackEvent("sign_in_started", { source: "auth_gate" })}
            className="inline-flex rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground"
          >
            Sign in
          </a>
          <a
            href={getArtifactRoutePath(basePath, "sign-up")}
            className="ml-3 inline-flex rounded-full border border-border px-5 py-3 font-bold text-foreground"
          >
            Create account
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}