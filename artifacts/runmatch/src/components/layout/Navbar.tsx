import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useIdentity } from "@/hooks/use-identity";
import { useGetUnreadCount, getGetUnreadCountQueryKey } from "@workspace/api-client-react";
import { useNotifications } from "@/hooks/use-notifications";

export function Navbar() {
  const [location] = useLocation();
  const { myRunnerId } = useIdentity();

  const { data: unread } = useGetUnreadCount(
    { runnerId: myRunnerId! },
    { query: { enabled: !!myRunnerId, refetchInterval: 15_000, queryKey: getGetUnreadCountQueryKey({ runnerId: myRunnerId! }) } }
  );
  const unreadCount = unread?.count ?? 0;

  useNotifications(unread?.count, !!myRunnerId);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display font-bold text-2xl tracking-tight text-primary">
            RunDate
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link
              href="/run-date"
              className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith('/run-date') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              RunDate
            </Link>
            <Link
              href="/run-buddy"
              className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith('/run-buddy') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              RunBuddy
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/inbox" className="relative">
            <button className={`p-2 rounded-lg transition-colors hover:bg-muted ${location.startsWith('/inbox') || location.startsWith('/messages') ? 'text-primary' : 'text-muted-foreground'}`}>
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </Link>
          <Link href="/create-profile" className="hidden sm:block">
            <Button variant="outline" className="rounded-full">Join Community</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
