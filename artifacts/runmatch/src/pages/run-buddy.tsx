import { useState } from "react";
import { useListRunners, getListRunnersQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RunnerCard } from "@/components/ui/runner-card";
import { RunnerMap } from "@/components/ui/runner-map";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, MapPin, LayoutGrid, Map } from "lucide-react";
import { ListRunnersMode, ListRunnersExperience } from "@workspace/api-client-react";

export default function RunBuddy() {
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [experience, setExperience] = useState<ListRunnersExperience | undefined>();
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const { data: runners, isLoading } = useListRunners(
    { mode: ListRunnersMode.buddy, country: country || undefined, city: city || undefined, experience },
    { query: { queryKey: getListRunnersQueryKey({ mode: ListRunnersMode.buddy, country: country || undefined, city: city || undefined, experience }) } }
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow">
        <section className="bg-secondary/10 py-12 border-b border-border/50">
          <div className="container mx-auto px-4 text-center">
            <Users className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h1 className="text-4xl font-display font-bold mb-4">RunBuddy</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Find a local runner anywhere in the world. Perfect for exploring new cities or crushing long runs together.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-card p-4 rounded-xl border shadow-sm">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Country (e.g. Japan)" 
                value={country} 
                onChange={(e) => setCountry(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="City" 
                value={city} 
                onChange={(e) => setCity(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={experience || ""} onValueChange={(val) => setExperience(val as ListRunnersExperience)}>
              <SelectTrigger>
                <SelectValue placeholder="Experience Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
            <button 
              className="bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
              onClick={() => { setCountry(""); setCity(""); setExperience(undefined); }}
            >
              Clear Filters
            </button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading runners…" : `${runners?.length ?? 0} runner${runners?.length === 1 ? "" : "s"} found`}
            </p>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
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

          {viewMode === "map" ? (
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
                  <h3 className="text-xl font-display font-medium text-foreground mb-2">No buddies found</h3>
                  <p className="text-muted-foreground mb-6">Be the first to run in this area, or adjust your search.</p>
                  <button 
                    onClick={() => { setCountry(""); setCity(""); setExperience(undefined); }}
                    className="text-secondary font-medium hover:underline"
                  >
                    Clear all filters
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
