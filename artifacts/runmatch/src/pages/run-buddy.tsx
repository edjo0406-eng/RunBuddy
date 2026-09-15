import { useState } from "react";
import { useListRunners, getListRunnersQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RunnerCard } from "@/components/ui/runner-card";
import { RunnerMap } from "@/components/ui/runner-map";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Compass, Search, Users, MapPin, LayoutGrid, Map, SlidersHorizontal } from "lucide-react";
import { ListRunnersMode, ListRunnersExperience } from "@workspace/api-client-react";

export default function RunBuddy() {
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [experience, setExperience] = useState<ListRunnersExperience | undefined>();
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const { data: runners, isLoading, isError, refetch } = useListRunners(
    { mode: ListRunnersMode.buddy, country: country || undefined, city: city || undefined, experience },
    { query: { queryKey: getListRunnersQueryKey({ mode: ListRunnersMode.buddy, country: country || undefined, city: city || undefined, experience }) } }
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-foreground text-background">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-primary/20" />
          <div className="absolute right-16 top-16 h-28 w-28 rounded-full border border-secondary/50" />
          <div className="container relative mx-auto grid gap-8 px-4 py-14 md:grid-cols-[1fr_auto] md:items-end md:py-16 lg:px-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-primary">
                <Compass className="h-4 w-4" />
                <span className="font-mono-label text-[10px]">the community finder</span>
              </div>
              <h1 data-testid="heading-run-buddy" className="mt-5 font-display text-5xl font-bold leading-[.95] tracking-tight sm:text-6xl">Find your<br /><span className="text-primary">RunBuddy.</span></h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-background/65">
                Search the club by place and pace. Meet someone for a morning loop, a travel run, or the route you keep promising yourself you will try.
              </p>
            </div>
            <div className="hidden border-l border-background/20 pl-7 md:block">
              <span className="font-mono-label text-[10px] text-background/45">live directory</span>
              <span className="mt-2 block font-display text-3xl font-bold text-primary">{isLoading ? "—" : runners?.length ?? 0}</span>
              <span className="text-xs text-background/55">runners open to a buddy</span>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8 lg:px-6">
          <div className="mb-7 flex items-center gap-2 text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-mono-label text-[10px]">shape your search</span>
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-foreground/10 bg-card p-3 shadow-[0_12px_30px_hsl(var(--foreground)/.05)] md:grid-cols-4 md:p-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="buddy-filter-country" className="text-xs font-medium text-foreground">Country</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="buddy-filter-country"
                  data-testid="input-filter-country"
                  placeholder="e.g. Japan"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="buddy-filter-city" className="text-xs font-medium text-foreground">City</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="buddy-filter-city"
                  data-testid="input-filter-city"
                  placeholder="e.g. Tokyo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="buddy-filter-experience" className="text-xs font-medium text-foreground">Experience level</label>
              <Select value={experience || ""} onValueChange={(val) => setExperience(val as ListRunnersExperience)}>
                <SelectTrigger id="buddy-filter-experience" data-testid="select-filter-experience">
                  <SelectValue placeholder="Any experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button 
              data-testid="button-clear-filters"
              className="self-end rounded-md bg-primary py-2 font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(var(--foreground))]"
              onClick={() => { setCountry(""); setCity(""); setExperience(undefined); }}
            >
              Reset search
            </button>
          </div>

          <div className="mb-6 mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p data-testid="status-runner-results" className="text-sm text-muted-foreground">
              {isLoading ? "Finding runners…" : `${runners?.length ?? 0} runner${runners?.length === 1 ? "" : "s"} found`}
            </p>
            <div className="flex items-center gap-1 self-start rounded-lg bg-muted p-1 sm:self-auto">
              <button
                data-testid="button-view-grid"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </button>
              <button
                data-testid="button-view-map"
                aria-pressed={viewMode === "map"}
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "map"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Map className="w-4 h-4" />
                Map
              </button>
            </div>
          </div>

          {isError ? (
            <div className="border border-secondary/30 bg-secondary/10 px-6 py-20 text-center">
              <Users className="mx-auto mb-4 h-10 w-10 text-secondary" />
              <h3 className="font-display text-2xl font-bold">The directory missed a step.</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">We could not load runners right now. Your filters are still here.</p>
              <button data-testid="button-retry-runners" onClick={() => refetch()} className="mt-6 inline-flex items-center gap-2 bg-foreground px-5 py-3 text-sm font-bold text-background transition-transform hover:-translate-y-0.5">
                Try again <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : viewMode === "map" ? (
            <div>
              {isLoading ? (
                <div className="w-full rounded-xl overflow-hidden border" style={{ height: 580 }}>
                  <Skeleton className="w-full h-full" />
                </div>
              ) : (
                <RunnerMap runners={runners ?? []} />
              )}
              {!isLoading && runners && runners.length > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Click a pin to see runner details. {runners.filter(r => r.lat != null).length} of {runners.length} runners have location data.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {isLoading ? (
                Array(8).fill(0).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              ) : runners?.length ? (
                runners.map(runner => (
                  <RunnerCard key={runner.id} runner={runner} />
                ))
              ) : (
                <div className="col-span-full py-24 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                   <h3 className="mb-2 font-display text-xl font-medium text-foreground">No buddies found here yet</h3>
                   <p className="mb-6 text-muted-foreground">Try a nearby city, widen the experience filter, or be the first to run in this area.</p>
                  <button 
                     data-testid="button-empty-clear-filters"
                    onClick={() => { setCountry(""); setCity(""); setExperience(undefined); }}
                     className="inline-flex items-center gap-2 font-bold text-secondary hover:underline"
                  >
                     Clear all filters <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
