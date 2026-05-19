import { useParams, useLocation } from "wouter";
import { useGetRunner, getGetRunnerQueryKey, useCreateConnection } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Activity, Timer, Medal, Heart, Users, ExternalLink, MessageSquare, Plane } from "lucide-react";
import defaultAvatarM from "@/assets/images/avatar-m.png";
import defaultAvatarF from "@/assets/images/avatar-f.png";
import { useToast } from "@/hooks/use-toast";
import { CreateConnectionBodyType } from "@workspace/api-client-react";
import { useIdentity } from "@/hooks/use-identity";

export default function RunnerProfile() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { myRunnerId } = useIdentity();
  
  const { data: runner, isLoading } = useGetRunner(id, { query: { enabled: !!id, queryKey: getGetRunnerQueryKey(id) } });
  const createConnection = useCreateConnection();

  const handleMessage = () => {
    if (!myRunnerId) {
      navigate("/inbox");
    } else {
      navigate(`/messages/${id}`);
    }
  };

  const handleConnect = (type: CreateConnectionBodyType) => {
    createConnection.mutate({
      data: {
        fromRunnerId: 1, // Mock current user
        toRunnerId: id,
        type: type,
        message: "Hey! I'd love to connect."
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Connection request sent!",
          description: `Your ${type} request has been sent to ${runner?.name}.`,
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Could not send request. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-12">
          <Skeleton className="w-32 h-32 rounded-full mb-8" />
          <Skeleton className="h-12 w-1/3 mb-4" />
          <Skeleton className="h-6 w-1/4 mb-12" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!runner) return <div>Not found</div>;

  const isFemale = runner.gender?.toLowerCase() === 'female';
  const defaultAvatar = isFemale ? defaultAvatarF : defaultAvatarM;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow">
        <div className="bg-muted/30 border-b border-border/50 py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <img 
                src={runner.avatarUrl || defaultAvatar} 
                alt={runner.name}
                className="w-48 h-48 object-cover rounded-2xl shadow-xl border-4 border-background"
              />
              
              <div className="flex-grow">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">{runner.name}</h1>
                  {runner.age && <span className="text-3xl text-muted-foreground font-light">{runner.age}</span>}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center text-muted-foreground text-lg">
                    <MapPin className="w-5 h-5 mr-2 text-primary" />
                    {runner.city}, {runner.country}
                  </div>
                  {runner.travelCity && runner.travelCountry && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
                      <Plane className="w-4 h-4 text-amber-500" />
                      <span>
                        Currently in {runner.travelCity}, {runner.travelCountry}
                        {runner.travelUntil ? ` · until ${runner.travelUntil}` : ""}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 mb-8">
                  {(runner.lookingFor === 'date' || runner.lookingFor === 'both') && (
                    <Button onClick={() => handleConnect('date')} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                      <Heart className="w-4 h-4 mr-2" /> Connect for Date
                    </Button>
                  )}
                  {(runner.lookingFor === 'buddy' || runner.lookingFor === 'both') && (
                    <Button onClick={() => handleConnect('buddy')} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <Users className="w-4 h-4 mr-2" /> Connect for Buddy
                    </Button>
                  )}
                  {myRunnerId !== id && (
                    <Button onClick={handleMessage} variant="outline" className="rounded-full border-border">
                      <MessageSquare className="w-4 h-4 mr-2" /> Send Message
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-2xl font-display font-bold mb-4">About</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {runner.bio || "This runner hasn't written a bio yet."}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-bold mb-4">Running Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <Activity className="w-6 h-6 text-primary mb-2" />
                      <span className="text-2xl font-display font-bold">{runner.runningStats?.weeklyMileageKm || 0}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Weekly km</span>
                    </CardContent>
                  </Card>
                  <Card className="bg-secondary/5 border-secondary/20">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <Timer className="w-6 h-6 text-secondary mb-2" />
                      <span className="text-2xl font-display font-bold">{runner.runningStats?.avgPacePerKm || '-'}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Avg Pace /km</span>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50 border-border/50">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <Medal className="w-6 h-6 text-foreground mb-2" />
                      <span className="text-2xl font-display font-bold">{runner.runningStats?.totalRaces || 0}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Races</span>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50 border-border/50">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <Activity className="w-6 h-6 text-foreground mb-2" />
                      <span className="text-2xl font-display font-bold capitalize">{runner.experience || '-'}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Level</span>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-display font-bold mb-4">Personal Bests</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "5K", value: runner.runningStats?.personalBest5k },
                    { label: "10K", value: runner.runningStats?.personalBest10k },
                    { label: "Half", value: runner.runningStats?.personalBestHalfMarathon },
                    { label: "Marathon", value: runner.runningStats?.personalBestMarathon },
                  ].map((pb) => (
                    <div key={pb.label} className="border rounded-xl p-4 text-center bg-card">
                      <span className="text-sm font-semibold text-muted-foreground block mb-1">{pb.label}</span>
                      <span className="text-xl font-display font-bold text-foreground">{pb.value || '--:--'}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {runner.runningStats?.preferredRunTypes && runner.runningStats.preferredRunTypes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display">Preferred Runs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {runner.runningStats.preferredRunTypes.map(type => (
                        <Badge key={type} variant="secondary" className="capitalize text-sm py-1 px-3">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Tracking Apps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {runner.trackingApps?.stravaUrl && (
                    <a href={runner.trackingApps.stravaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <span className="font-medium text-[#FC4C02]">Strava</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {runner.trackingApps?.garminUrl && (
                    <a href={runner.trackingApps.garminUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <span className="font-medium text-[#007CC3]">Garmin</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {runner.trackingApps?.nikeRunClubUrl && (
                    <a href={runner.trackingApps.nikeRunClubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <span className="font-medium text-foreground">Nike Run Club</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {!runner.trackingApps?.stravaUrl && !runner.trackingApps?.garminUrl && !runner.trackingApps?.nikeRunClubUrl && (
                    <p className="text-sm text-muted-foreground">No tracking apps linked.</p>
                  )}
                </CardContent>
              </Card>
            </div>
            
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
