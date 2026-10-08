import { Link, useLocation } from "wouter";
import { useAuth, useClerk } from "@clerk/react";
import { ArrowUpRight, MessageSquare, Users } from "lucide-react";
import { useIdentity } from "@/hooks/use-identity";
import {
  getGetCurrentRunnerQueryKey,
  getGetUnreadCountQueryKey,
  useGetCurrentRunner,
  useGetUnreadCount,
} from "@workspace/api-client-react";
import { useNotifications } from "@/hooks/use-notifications";
import { getArtifactRootPath } from "@/lib/auth-paths";

export function Navbar() {
  const [location] = useLocation();
  const { myRunnerId } = useIdentity();
  const { isLoaded, isSignedIn, userId } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const { signOut } = useClerk();
  const isAuthResolved = isLoaded && isSignedIn !== null;
  const {
    data: authenticatedRunner,
    isError: isRunnerLookupError,
    isFetching: isRunnerLookupFetching,
    refetch: refetchCurrentRunner,
  } = useGetCurrentRunner({
    query: {
      enabled: isAuthResolved && isSignedIn === true && Boolean(userId),
      queryKey: [...getGetCurrentRunnerQueryKey(), userId],
    },
  });
  const ownRunnerId = isRunnerLookupError
    ? null
    : authenticatedRunner?.runnerId ?? null;

  const { data: unread } = useGetUnreadCount(
    {
      query: {
        enabled:
          isAuthResolved &&
          isSignedIn === true &&
          Boolean(userId) &&
          Boolean(myRunnerId),
        refetchInterval: 15_000,
        queryKey: [...getGetUnreadCountQueryKey(), userId],
      },
    },
  );
  const unreadCount = unread?.count ?? 0;

  useNotifications(
    unread?.count,
    isAuthResolved &&
      isSignedIn === true &&
      Boolean(userId) &&
      Boolean(myRunnerId),
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-foreground/10 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <div className="container mx-auto flex h-[4.5rem] items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" data-testid="link-brand" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary shadow-[3px_3px_0_hsl(var(--primary))] transition-transform duration-300 group-hover:-translate-y-0.5">
              <Users className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </span>
            <span className="leading-none">
              <span className="block font-display text-[1.18rem] font-bold tracking-tight text-foreground">RunBuddy</span>
              <span className="font-mono-label mt-1 block text-[8px] text-muted-foreground">runmatch community</span>
            </span>
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-2 md:flex">
            <Link
              href="/run-buddy"
              data-testid="link-nav-run-buddy"
              className={`group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all hover:bg-foreground hover:text-primary ${location.startsWith('/run-buddy') ? 'bg-foreground text-primary' : 'text-foreground'}`}
            >
              <Users className="h-4 w-4 transition-transform group-hover:scale-110" />
              RunBuddy
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isAuthResolved && isSignedIn === true ? (
            <button
              type="button"
              onClick={() =>
                signOut({
                  redirectUrl: getArtifactRootPath(import.meta.env.BASE_URL),
                })
              }
              className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Log out
            </button>
          ) : isAuthResolved && isSignedIn === false ? (
            <Link
              href="/sign-in"
              className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign in
            </Link>
          ) : null}
          {isAuthResolved && isSignedIn === true && isRunnerLookupError ? (
            <div
              role="alert"
              data-testid="status-nav-profile-navigation-error"
              className="hidden items-center gap-2 text-sm md:flex"
            >
              <span className="text-muted-foreground">
                Profile navigation couldn’t be loaded.
              </span>
              <button
                type="button"
                data-testid="button-nav-retry-profile"
                onClick={() => void refetchCurrentRunner()}
                disabled={isRunnerLookupFetching}
                className="rounded-full px-2 py-1 font-semibold text-foreground underline decoration-foreground/40 underline-offset-2 hover:decoration-foreground disabled:cursor-wait disabled:opacity-60"
              >
                {isRunnerLookupFetching ? "Retrying…" : "Try again"}
              </button>
            </div>
          ) : null}
          <Link
            href="/inbox"
            data-testid="link-nav-inbox"
            aria-label={unreadCount > 0 ? `Inbox, ${unreadCount} unread` : "Inbox"}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted ${location.startsWith('/inbox') || location.startsWith('/messages') ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            <MessageSquare className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span data-testid="badge-unread-count" className="absolute right-0 top-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-bold text-secondary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          {isAuthResolved &&
            (isSignedIn === false ||
              ownRunnerId !== null ||
              (!isRunnerLookupError && authenticatedRunner?.runnerId === null)) && (
              <Link
                href={
                  isSignedIn === false
                    ? "/sign-up"
                    : ownRunnerId !== null
                      ? `/runner/${ownRunnerId}`
                      : "/create-profile"
                }
                data-testid={
                  isSignedIn === false
                    ? "link-nav-join"
                    : ownRunnerId !== null
                      ? "link-nav-my-profile"
                      : "link-nav-create-profile"
                }
                className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(var(--foreground))] sm:flex"
              >
                {isSignedIn === false
                  ? "Join the club"
                  : ownRunnerId !== null
                    ? "My profile"
                    : "Create profile"}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
        </div>
      </div>
    </header>
  );
}
