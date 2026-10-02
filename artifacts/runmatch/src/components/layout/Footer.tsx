import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-foreground/10 bg-foreground py-12 text-background">
      <div className="container mx-auto flex flex-col items-center justify-between gap-7 px-4 md:flex-row lg:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-foreground">
              <span className="font-display text-sm font-bold">R</span>
            </span>
            <span className="font-display text-xl font-bold tracking-tight">RunBuddy</span>
          </div>
          <span className="mt-2 block text-xs text-background/55">RunMatch community · © {new Date().getFullYear()}</span>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-background/65">
          <Link href="/" data-testid="link-footer-home" className="transition-colors hover:text-primary">Home</Link>
          <Link href="/run-buddy" data-testid="link-footer-run-buddy" className="font-bold text-background transition-colors hover:text-primary">RunBuddy</Link>
          <Link href="/create-profile" data-testid="link-footer-join" className="transition-colors hover:text-primary">Join the club</Link>
        </nav>
      </div>
    </footer>
  );
}
