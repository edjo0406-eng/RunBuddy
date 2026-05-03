import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 py-12 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-xl text-primary tracking-tight">RunMatch</span>
          <span className="text-muted-foreground text-sm">© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="/run-date" className="hover:text-primary transition-colors">RunDate</Link>
          <Link href="/run-buddy" className="hover:text-primary transition-colors">RunBuddy</Link>
        </nav>
      </div>
    </footer>
  );
}
