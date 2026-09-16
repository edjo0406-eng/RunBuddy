import { Link } from "wouter";
import { trackEvent } from "@/lib/analytics";
import { Activity, ArrowRight, Globe2, Heart, MapPin, Route, Users } from "lucide-react";
import {
  getGetFeaturedRunnersQueryKey,
  getGetStatsSummaryQueryKey,
  useGetFeaturedRunners,
  useGetStatsSummary,
} from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RunnerCard } from "@/components/ui/runner-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import heroBg from "@/assets/images/hero-bg.png";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary({
    query: { queryKey: getGetStatsSummaryQueryKey() },
  });
  const { data: featuredRunners, isLoading: featuredLoading, isError: featuredError } = useGetFeaturedRunners({
    query: { queryKey: getGetFeaturedRunnersQueryKey() },
  });

  return (
    <div className="runmatch-noise flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-grow">
        <section className="relative overflow-hidden bg-foreground text-background">
          <div className="absolute inset-0 opacity-20">
            <img src={heroBg} alt="" className="h-full w-full object-cover mix-blend-screen" />
          </div>
          <div className="absolute -right-32 top-[-20%] h-[30rem] w-[30rem] rounded-full border border-primary/30" />
          <div className="absolute -right-16 top-[-12%] h-[23rem] w-[23rem] rounded-full border border-primary/20" />

          <div className="container relative mx-auto grid min-h-[42rem] items-center gap-12 px-4 py-16 md:grid-cols-[1.05fr_.95fr] md:py-20 lg:min-h-[48rem] lg:px-6">
            <div className="max-w-2xl">
              <div className="reveal-up inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-2 text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-mono-label text-[10px]">the running community, worldwide</span>
              </div>
              <h1 className="reveal-up reveal-up-delay-1 mt-7 max-w-xl font-display text-[3.8rem] font-bold leading-[.93] tracking-[-.065em] text-balance sm:text-7xl lg:text-[6.8rem]">
                Your next run<br />
                <span className="text-primary">has company.</span>
              </h1>
              <p className="reveal-up reveal-up-delay-2 mt-7 max-w-lg text-base leading-7 text-background/70 sm:text-lg">
                RunBuddy connects you with runners who know the city, share your pace, or simply want to show up at the same start line.
              </p>
              <div className="reveal-up reveal-up-delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/run-buddy"
                  data-testid="link-hero-find-buddy"
                  onClick={() => trackEvent("landing_cta_clicked", { action: "find_buddy", location: "hero" })}
                  className="group inline-flex items-center justify-center gap-3 bg-primary px-6 py-3.5 text-sm font-extrabold text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[5px_5px_0_hsl(var(--secondary))]"
                >
                  Find a RunBuddy
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/create-profile"
                  data-testid="link-hero-join"
                  onClick={() => trackEvent("landing_cta_clicked", { action: "join", location: "hero" })}
                  className="inline-flex items-center justify-center gap-2 border border-background/25 px-6 py-3.5 text-sm font-bold text-background transition-colors hover:border-primary hover:text-primary"
                >
                  Put yourself on the map
                </Link>
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-background/55">
                <span className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-primary" /> City to city</span>
                <span className="flex items-center gap-2"><Route className="h-4 w-4 text-primary" /> Route-ready</span>
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Community first</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[31rem] self-end md:mb-4">
              <div className="absolute -left-5 top-10 z-10 rotate-[-5deg] bg-primary px-4 py-3 text-foreground shadow-[5px_5px_0_hsl(var(--secondary))]">
                <span className="font-mono-label block text-[9px]">today’s good idea</span>
                <span className="mt-1 block font-display text-lg font-bold">Run together.</span>
              </div>
              <div className="relative aspect-[.84] overflow-hidden border border-background/20 bg-background/10 p-3 shadow-2xl">
                <div className="relative h-full overflow-hidden bg-secondary">
                  <img src={heroBg} alt="Runners moving together at dawn" className="h-full w-full object-cover opacity-90 mix-blend-multiply" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-transparent to-transparent" />
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" fill="none" aria-hidden="true">
                    <path className="route-dash" d="M-20 388C80 360 65 256 164 284C254 310 202 170 430 126" stroke="hsl(var(--primary))" strokeWidth="3" />
                    <circle cx="164" cy="284" r="7" fill="hsl(var(--primary))" />
                    <circle cx="164" cy="284" r="13" stroke="hsl(var(--primary))" strokeOpacity=".5" />
                  </svg>
                  <div className="absolute bottom-5 left-5 right-5">
                    <span className="font-mono-label text-[10px] text-primary">run note / 07:12</span>
                    <p className="mt-2 max-w-xs font-display text-2xl font-bold leading-tight text-background">Same route.<br />Different story.</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-3 flex items-center gap-3 border border-foreground/10 bg-background px-4 py-3 text-foreground shadow-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent"><MapPin className="h-4 w-4" /></span>
                <span><span className="block font-display text-sm font-bold">Everywhere runners go</span><span className="font-mono-label text-[9px] text-muted-foreground">meet beyond your usual</span></span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-foreground/10 bg-primary py-5">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 text-center text-sm font-bold text-primary-foreground sm:justify-between lg:px-6">
            <span className="font-mono-label text-[10px]">run where you are</span>
            <span className="hidden h-px flex-1 bg-primary-foreground/20 sm:block" />
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Local miles</span>
            <span className="flex items-center gap-2"><Globe2 className="h-4 w-4" /> Travel miles</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Shared miles</span>
          </div>
        </section>

        <section className="border-b border-foreground/10 py-16 md:py-20">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-end">
              <div>
                <span className="font-mono-label text-[10px] text-secondary">built for the in-between</span>
                <h2 className="mt-3 max-w-md font-display text-4xl font-bold leading-[.98] tracking-tight sm:text-5xl">A good run is better shared.</h2>
              </div>
              <p className="max-w-xl justify-self-end text-base leading-7 text-muted-foreground">
                New city, new training block, or the same three loops you have memorised. Find the person who makes getting out the door feel easy.
              </p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-[1.35fr_.8fr_.8fr]">
              <div className="group relative min-h-[15rem] overflow-hidden bg-foreground p-7 text-background transition-transform duration-500 hover:-translate-y-1">
                <span className="font-mono-label text-[10px] text-primary">01 / find your people</span>
                <h3 className="mt-12 max-w-xs font-display text-3xl font-bold leading-tight">Search by city, pace, and experience.</h3>
                <Link href="/run-buddy" data-testid="link-how-search" className="absolute bottom-6 left-7 flex items-center gap-2 text-sm font-bold text-primary">Explore RunBuddy <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              </div>
              <div className="min-h-[15rem] border border-foreground/10 bg-accent/45 p-7">
                <span className="font-mono-label text-[10px] text-muted-foreground">02 / make a plan</span>
                <h3 className="mt-12 font-display text-2xl font-bold leading-tight">Message before the first mile.</h3>
              </div>
              <div className="min-h-[15rem] border border-foreground/10 bg-secondary p-7 text-secondary-foreground">
                <span className="font-mono-label text-[10px]">03 / show up</span>
                <h3 className="mt-12 font-display text-2xl font-bold leading-tight">Leave with a route worth repeating.</h3>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/40 py-16 md:py-20">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <span className="font-mono-label text-[10px] text-secondary">the club, in numbers</span>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Miles have a way of connecting.</h2>
              </div>
              <Link href="/run-buddy" data-testid="link-stats-buddy" className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-secondary">See the live community <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden border border-foreground/10 bg-foreground/10 md:grid-cols-4">
              {statsLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="bg-background p-6"><Skeleton className="h-10 w-20" /><Skeleton className="mt-3 h-4 w-28" /></div>
                ))
              ) : (
                <>
                  <div data-testid="text-stat-total-runners" className="bg-background p-6 sm:p-8"><Activity className="h-5 w-5 text-secondary" /><span className="mt-5 block font-display text-4xl font-bold">{stats?.totalRunners || 0}</span><span className="mt-1 block text-xs font-bold text-muted-foreground">runners in the club</span></div>
                  <div data-testid="text-stat-countries" className="bg-background p-6 sm:p-8"><Globe2 className="h-5 w-5 text-primary" /><span className="mt-5 block font-display text-4xl font-bold">{stats?.countriesRepresented || 0}</span><span className="mt-1 block text-xs font-bold text-muted-foreground">countries represented</span></div>
                  <div data-testid="text-stat-buddy-runners" className="bg-background p-6 sm:p-8"><Users className="h-5 w-5 text-primary" /><span className="mt-5 block font-display text-4xl font-bold">{stats?.buddyRunners || 0}</span><span className="mt-1 block text-xs font-bold text-muted-foreground">open to a RunBuddy</span></div>
                  <div data-testid="text-stat-date-runners" className="bg-background p-6 sm:p-8"><Heart className="h-5 w-5 text-secondary" /><span className="mt-5 block font-display text-4xl font-bold">{stats?.dateRunners || 0}</span><span className="mt-1 block text-xs font-bold text-muted-foreground">also exploring RunDate</span></div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <span className="font-mono-label text-[10px] text-secondary">say hi to the community</span>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">Runners near the start line.</h2>
              </div>
              <Link href="/run-buddy" data-testid="link-featured-see-all" className="inline-flex items-center gap-2 text-sm font-bold text-foreground hover:text-secondary">Browse all RunBuddies <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-4"><Skeleton className="aspect-square w-full rounded-xl" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
                ))
              ) : featuredError ? (
                <div className="col-span-full border border-secondary/30 bg-secondary/10 p-8 text-center">
                  <p className="font-display text-xl font-bold">The community board is taking a breather.</p>
                  <p className="mt-2 text-sm text-muted-foreground">Try RunBuddy to search live runner profiles.</p>
                </div>
              ) : featuredRunners?.length ? (
                featuredRunners.map((runner) => <RunnerCard key={runner.id} runner={runner} />)
              ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground">No featured runners found yet.</div>
              )}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20 lg:px-6">
          <div className="relative overflow-hidden bg-secondary px-6 py-12 text-secondary-foreground sm:px-12 md:py-16">
            <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full border-[20px] border-secondary-foreground/10" />
            <div className="relative max-w-2xl">
              <Badge className="rounded-none border-secondary-foreground/20 bg-secondary-foreground/10 text-secondary-foreground hover:bg-secondary-foreground/10">RunBuddy is the starting point</Badge>
              <h2 className="mt-5 max-w-lg font-display text-4xl font-bold leading-[.98] tracking-tight sm:text-5xl">Your usual route is about to get more interesting.</h2>
              <Link href="/run-buddy" data-testid="link-bottom-find-buddy" className="mt-8 inline-flex items-center gap-2 bg-foreground px-5 py-3 text-sm font-bold text-background transition-transform hover:-translate-y-1">Find a running companion <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}