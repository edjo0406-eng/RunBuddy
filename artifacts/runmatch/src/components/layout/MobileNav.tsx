import { Link, useLocation } from "wouter";
import { Home, Heart, Users, MessageSquare, UserPlus } from "lucide-react";
import { useIdentity } from "@/hooks/use-identity";
import { useGetUnreadCount, getGetUnreadCountQueryKey } from "@workspace/api-client-react";

export function MobileNav() {
  const [location] = useLocation();
  const { myRunnerId } = useIdentity();

  const { data: unread } = useGetUnreadCount(
    { runnerId: myRunnerId! },
    { query: { enabled: !!myRunnerId, refetchInterval: 15_000, queryKey: getGetUnreadCountQueryKey({ runnerId: myRunnerId! }) } }
  );
  const unreadCount = unread?.count ?? 0;

  const items = [
    { href: "/", icon: Home, label: "Home", active: location === "/" },
    { href: "/run-date", icon: Heart, label: "RunDate", active: location.startsWith("/run-date") },
    { href: "/run-buddy", icon: Users, label: "RunBuddy", active: location.startsWith("/run-buddy") },
    { href: "/inbox", icon: MessageSquare, label: "Inbox", active: location.startsWith("/inbox") || location.startsWith("/messages"), badge: unreadCount },
    { href: "/create-profile", icon: UserPlus, label: "Join", active: location.startsWith("/create-profile") },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border/50 supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {items.map(({ href, icon: Icon, label, active, badge }) => (
          <Link key={href} href={href}>
            <button className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px] ${active ? "text-primary" : "text-muted-foreground"}`}>
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`} />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none ${active ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </button>
          </Link>
        ))}
      </div>
    </nav>
  );
}
