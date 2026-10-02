import { Link } from "wouter";
import { ArrowRight, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function RunDate() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-grow items-center bg-foreground px-4 py-20 text-background">
        <section className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-2 text-primary">
            <Users className="h-4 w-4" />
            <span className="font-mono-label text-[10px]">one running community</span>
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-[.95] tracking-tight sm:text-7xl">
            RunDate is now <span className="text-primary">RunBuddy.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-background/70">
            Find runners by city, pace, and experience for local routes, travel
            runs, and regular training—all in the RunBuddy community.
          </p>
          <Link
            href="/run-buddy"
            className="mt-9 inline-flex items-center gap-3 bg-primary px-6 py-3.5 text-sm font-extrabold text-primary-foreground transition-transform hover:-translate-y-1"
          >
            Find a running companion
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}