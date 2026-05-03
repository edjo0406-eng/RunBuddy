import { Link } from "wouter";
import { Runner } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Activity, Timer } from "lucide-react";
import defaultAvatarM from "@/assets/images/avatar-m.png";
import defaultAvatarF from "@/assets/images/avatar-f.png";

interface RunnerCardProps {
  runner: Runner;
}

export function RunnerCard({ runner }: RunnerCardProps) {
  const isFemale = runner.gender?.toLowerCase() === 'female';
  const defaultAvatar = isFemale ? defaultAvatarF : defaultAvatarM;

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img 
          src={runner.avatarUrl || defaultAvatar} 
          alt={runner.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
            {runner.name} {runner.age && <span className="font-sans font-normal text-muted-foreground text-lg">{runner.age}</span>}
          </h3>
          <div className="flex items-center text-muted-foreground text-sm mt-1">
            <MapPin className="w-3 h-3 mr-1 text-primary" />
            {runner.city}, {runner.country}
          </div>
        </div>
      </div>
      
      <CardContent className="p-4 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {runner.bio || "No bio provided."}
        </p>
        
        <div className="flex flex-wrap gap-2">
          {runner.experience && (
            <Badge variant="secondary" className="capitalize text-xs font-medium">
              <Activity className="w-3 h-3 mr-1" />
              {runner.experience}
            </Badge>
          )}
          {runner.runningStats?.avgPacePerKm && (
            <Badge variant="outline" className="text-xs font-medium border-primary/20 text-primary">
              <Timer className="w-3 h-3 mr-1" />
              {runner.runningStats.avgPacePerKm}/km
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Link href={`/runner/${runner.id}`} className="w-full">
          <button className="w-full py-2 rounded-lg bg-primary/10 text-primary font-medium text-sm hover:bg-primary hover:text-primary-foreground transition-colors">
            View Profile
          </button>
        </Link>
      </CardFooter>
    </Card>
  );
}
