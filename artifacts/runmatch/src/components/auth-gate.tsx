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
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isSignedIn) {
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