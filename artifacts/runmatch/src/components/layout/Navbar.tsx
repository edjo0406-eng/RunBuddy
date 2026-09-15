import { Link, useLocation } from "wouter";
import { ArrowUpRight, Heart, MessageSquare, Users } from "lucide-react";
import { useIdentity } from "@/hooks/use-identity";
import { useGetUnreadCount, getGetUnreadCountQueryKey } from "@workspace/api-client-react";
import { useNotifications } from "@/hooks/use-notifications";

export function Navbar() {
  const [location] = useLocation();
  const { myRunnerId } = useIdentity();

  const { data: unread } = useGetUnreadCount(
    { query: { enabled: !!myRunnerId, refetchInterval: 15_000, queryKey: getGetUnreadCountQueryKey() } }
  );
  const unreadCount = unread?.count ?? 0;

  useNotifications(unread?.count, !!myRunnerId);

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
            <Link
              href="/run-date"
              data-testid="link-nav-run-date"
              className={`group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/10 hover:text-secondary ${location.startsWith('/run-date') ? 'text-secondary' : 'text-muted-foreground'}`}
            >
              <Heart className="h-4 w-4 transition-transform group-hover:scale-110" />
              RunDate
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
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
          <Link href="/create-profile" data-testid="link-nav-join" className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(var(--foreground))] sm:flex">
            Join the club
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
