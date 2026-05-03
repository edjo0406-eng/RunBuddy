import { useState } from "react";
import { Link } from "wouter";
import { useListRunners, getListRunnersQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RunnerCard } from "@/components/ui/runner-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Heart } from "lucide-react";
import { ListRunnersMode, ListRunnersExperience } from "@workspace/api-client-react";

export default function RunDate() {
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [experience, setExperience] = useState<ListRunnersExperience | undefined>();

  const { data: runners, isLoading } = useListRunners(
    { mode: ListRunnersMode.date, country: country || undefined, city: city || undefined, experience },
    { query: { queryKey: getListRunnersQueryKey({ mode: ListRunnersMode.date, country: country || undefined, city: city || undefined, experience }) } }
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow">
        <section className="bg-primary/5 py-12 border-b border-border/50">
          <div className="container mx-auto px-4 text-center">
            <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-display font-bold mb-4">RunDate</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Find a partner who understands your training schedule. Connect with local runners looking for romance.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-card p-4 rounded-xl border shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Country" 
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
              className="bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/90 transition-colors"
              onClick={() => { setCountry(""); setCity(""); setExperience(undefined); }}
            >
              Clear Filters
            </button>
          </div>

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
                <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-display font-medium text-foreground mb-2">No matches found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your filters or checking back later.</p>
                <button 
                  onClick={() => { setCountry(""); setCity(""); setExperience(undefined); }}
                  className="text-primary font-medium hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
