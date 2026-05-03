import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display font-bold text-2xl tracking-tight text-primary">
            RunMatch
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
        <div className="flex items-center gap-4">
          <Link href="/create-profile" className="hidden sm:block">
            <Button variant="outline" className="rounded-full">Join Community</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
