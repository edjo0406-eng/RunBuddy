import { Link } from "wouter";
import { Runner } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Activity, Timer, Plane } from "lucide-react";
import { defaultRunnerImages, runnerCardImageSizes } from "@/lib/public-images";
import { resolveAvatarUrl } from "@/lib/avatar";

interface RunnerCardProps {
  runner: Runner;
}

export function RunnerCard({ runner }: RunnerCardProps) {
  const isFemale = runner.gender?.toLowerCase() === 'female';
  const defaultAvatar = isFemale ? defaultRunnerImages.female : defaultRunnerImages.male;
  const avatarUrl = resolveAvatarUrl(runner.avatarUrl);
  const isTravelling = !!(runner.travelCity && runner.travelCountry);
  const isClub = runner.profileType !== "individual";
  const displayName = isClub ? runner.clubName || runner.name : runner.name;
  const profileTypeLabel = runner.profileType === "official_club" ? "Official club" : runner.profileType === "social_club" ? "Social club" : null;

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <picture>
          {!avatarUrl && (
            <source type="image/webp" srcSet={defaultAvatar.webp} sizes={runnerCardImageSizes} />
          )}
          <img
            src={avatarUrl || defaultAvatar.src}
            srcSet={avatarUrl ? undefined : defaultAvatar.jpeg}
            sizes={avatarUrl ? undefined : runnerCardImageSizes}
            width={960}
            height={960}
            loading="lazy"
            decoding="async"
            alt={displayName}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        {isTravelling && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-400/90 text-amber-950 backdrop-blur-sm shadow-sm">
              <Plane className="w-2.5 h-2.5" />
              Travelling
            </span>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
            {displayName} {!isClub && runner.age && <span className="font-sans font-normal text-muted-foreground text-lg">{runner.age}</span>}
          </h3>
          {profileTypeLabel && (
            <Badge className="mt-1 rounded-full bg-primary/15 text-primary hover:bg-primary/15">
              {profileTypeLabel}
            </Badge>
          )}
          <div className="flex items-center text-muted-foreground text-sm mt-1">
            <MapPin className="w-3 h-3 mr-1 text-primary" />
            {runner.city}, {runner.country}
          </div>
          {isTravelling && (
            <div className="flex items-center text-amber-400 text-xs mt-0.5 font-medium">
              <Plane className="w-3 h-3 mr-1" />
              In {runner.travelCity}{runner.travelUntil ? ` until ${runner.travelUntil}` : ""}
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-4 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {isClub ? runner.clubDescription || runner.bio || "No club description provided." : runner.bio || "No bio provided."}
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
        <Link
          href={`/runner/${runner.id}`}
          className="w-full rounded-lg bg-primary/10 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          View Profile
        </Link>
      </CardFooter>
    </Card>
  );
}
