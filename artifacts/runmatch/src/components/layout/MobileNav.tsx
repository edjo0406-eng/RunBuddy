import { Link, useLocation } from "wouter";
import { useAuth, useClerk } from "@clerk/react";
import { Home, Users, MessageSquare, UserPlus, UserRound, LogOut } from "lucide-react";
import { useIdentity } from "@/hooks/use-identity";
import {
  getGetCurrentRunnerQueryKey,
  getGetUnreadCountQueryKey,
  useGetCurrentRunner,
  useGetUnreadCount,
} from "@workspace/api-client-react";
import { getArtifactRootPath } from "@/lib/auth-paths";

export function MobileNav() {
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
  } = useGetCurrentRunner({
    query: {
      enabled: isAuthResolved && isSignedIn === true && Boolean(userId),
      queryKey: [...getGetCurrentRunnerQueryKey(), userId],
    },
  });
  const ownRunnerId = authenticatedRunner?.runnerId ?? null;

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

  const items = [
    { href: "/", icon: Home, label: "Home", testId: "link-mobile-home", active: location === "/" },
    { href: "/run-buddy", icon: Users, label: "RunBuddy", testId: "link-mobile-runbuddy", active: location.startsWith("/run-buddy"), primary: true },
    { href: "/inbox", icon: MessageSquare, label: "Inbox", testId: "link-mobile-inbox", active: location.startsWith("/inbox") || location.startsWith("/messages"), badge: unreadCount },
    ...(isAuthResolved && isSignedIn === true
      ? !isRunnerLookupError && authenticatedRunner
        ? [{
            href: ownRunnerId !== null ? `/runner/${ownRunnerId}` : "/create-profile",
            icon: ownRunnerId !== null ? UserRound : UserPlus,
            label: ownRunnerId !== null ? "My profile" : "Create profile",
            testId: ownRunnerId !== null ? "link-mobile-my-profile" : "link-mobile-create-profile",
            active: ownRunnerId !== null
              ? location === `/runner/${ownRunnerId}`
              : location.startsWith("/create-profile"),
          }]
        : []
      : [{
          href: "/create-profile",
          icon: UserPlus,
          label: "Join",
          testId: "link-mobile-join",
          active: location.startsWith("/create-profile"),
        }]),
  ];

  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-foreground/10 bg-background/95 backdrop-blur-xl md:hidden supports-[backdrop-filter]:bg-background/80">
      <div className="safe-area-inset-bottom flex h-[4.5rem] items-center justify-around px-1">
        {items.map(({ href, icon: Icon, label, testId, active, badge, primary }) => (
          <Link
            key={href}
            href={href}
            data-testid={testId}
            className={`relative flex min-w-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 transition-all ${primary ? "min-w-[78px]" : ""} ${active ? (primary ? "bg-foreground text-primary" : "text-foreground") : "text-muted-foreground hover:text-foreground"}`}
          >
            <div className="relative">
              <Icon className={`transition-transform ${primary ? "h-[22px] w-[22px]" : "h-5 w-5"} ${active ? "scale-110" : ""}`} />
              {badge != null && badge > 0 && (
                <span data-testid="badge-mobile-unread-count" className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-0.5 text-[9px] font-bold text-secondary-foreground">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold leading-none ${primary ? "tracking-tight" : ""}`}>{label}</span>
          </Link>
        ))}
        {isAuthResolved && isSignedIn === true ? (
          <button
            type="button"
            aria-label="Log out"
            data-testid="button-mobile-logout"
            onClick={() =>
              signOut({
                redirectUrl: getArtifactRootPath(import.meta.env.BASE_URL),
              })
            }
            className="relative flex min-w-[48px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut aria-hidden="true" className="h-5 w-5" />
            <span className="text-[10px] font-bold leading-none">Log out</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}
