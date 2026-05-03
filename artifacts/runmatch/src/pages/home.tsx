import { Link } from "wouter";
import { useGetStatsSummary, useGetFeaturedRunners, getGetStatsSummaryQueryKey, getGetFeaturedRunnersQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { RunnerCard } from "@/components/ui/runner-card";
import { Heart, Users, MapPin, Activity } from "lucide-react";
import heroBg from "@/assets/images/hero-bg.png";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary({ query: { queryKey: getGetStatsSummaryQueryKey() } });
  const { data: featuredRunners, isLoading: featuredLoading } = useGetFeaturedRunners({ query: { queryKey: getGetFeaturedRunnersQueryKey() } });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src={heroBg} alt="Runners at dawn" className="w-full h-full object-cover opacity-20 dark:opacity-40 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
          
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-2xl">
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">The global running community</Badge>
              <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 leading-tight">
                Find your pace. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Find your person.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed">
                Whether you're looking for a running buddy while traveling, or a partner who understands early morning long runs.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/run-date" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full rounded-full group">
                    <Heart className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                    RunDate
                  </Button>
                </Link>
                <Link href="/run-buddy" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full rounded-full border-primary/20 hover:bg-primary/5">
                    <Users className="mr-2 w-4 h-4" />
                    RunBuddy
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {statsLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex flex-col items-center text-center space-y-2">
                    <Skeleton className="h-10 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))
              ) : (
                <>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-4xl font-display font-bold text-primary mb-2">{stats?.totalRunners || 0}</span>
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Activity className="w-4 h-4" /> Total Runners</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-4xl font-display font-bold text-foreground mb-2">{stats?.countriesRepresented || 0}</span>
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1"><MapPin className="w-4 h-4" /> Countries</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-4xl font-display font-bold text-foreground mb-2">{stats?.dateRunners || 0}</span>
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Heart className="w-4 h-4" /> Dating</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-4xl font-display font-bold text-foreground mb-2">{stats?.buddyRunners || 0}</span>
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" /> Buddies</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Featured Runners */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-display font-bold tracking-tight mb-2">Featured Runners</h2>
                <p className="text-muted-foreground">Meet some of the active members in our community.</p>
              </div>
              <Link href="/create-profile">
                <Button variant="ghost" className="hidden md:flex">Join them →</Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              ) : featuredRunners?.length ? (
                featuredRunners.map(runner => (
                  <RunnerCard key={runner.id} runner={runner} />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No featured runners found.
                </div>
              )}
            </div>
          </div>
        </section>

      </main>
      
      <Footer />
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
