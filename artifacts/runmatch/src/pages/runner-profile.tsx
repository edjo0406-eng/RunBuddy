import { useRef, useState, type ChangeEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { resolveAvatarUrl } from "@/lib/avatar";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetRunner,
  getGetRunnerQueryKey,
  useGetCurrentRunner,
  getGetCurrentRunnerQueryKey,
  useCreateConnection,
  useListConnections,
  getListConnectionsQueryKey,
  useDeleteConnection,
  useCreateRunnerBlock,
  useListRunnerBlocks,
  useDeleteRunnerBlock,
  useCreateRunnerReport,
  getListRunnerBlocksQueryKey,
  useUpdateRunner,
  useRequestUploadUrl,
  getGetFeaturedRunnersQueryKey,
  getListRunnersQueryKey,
  type UploadUrlRequestContentType,
  type CreateRunnerReportBodyReason,
} from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Activity, Timer, Medal, Users, ExternalLink, MessageSquare, Plane, Flag, ShieldBan, UserMinus } from "lucide-react";
import defaultAvatarM from "@/assets/images/avatar-m.png";
import defaultAvatarF from "@/assets/images/avatar-f.png";
import { useToast } from "@/hooks/use-toast";
import { CreateConnectionBodyType } from "@workspace/api-client-react";

function isSupportedProfilePhotoType(
  value: string,
): value is UploadUrlRequestContentType {
  return value === "image/jpeg" || value === "image/png" || value === "image/webp";
}

export default function RunnerProfile() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { isSignedIn } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const queryClient = useQueryClient();
  
  const { data: runner, isLoading } = useGetRunner(id, { query: { enabled: !!id, queryKey: getGetRunnerQueryKey(id) } });
  const {
    data: currentRunner,
    isError: isCurrentRunnerError,
  } = useGetCurrentRunner({
    query: { enabled: isSignedIn === true, queryKey: getGetCurrentRunnerQueryKey() },
  });
  const createConnection = useCreateConnection();
  const connectionsQuery = useListConnections(undefined, {
    query: {
      enabled: Boolean(currentRunner?.runnerId),
      queryKey: getListConnectionsQueryKey(),
    },
  });
  const deleteConnection = useDeleteConnection();
  const createRunnerBlock = useCreateRunnerBlock();
  const blockedRunnersQuery = useListRunnerBlocks({
    query: {
      enabled: Boolean(currentRunner?.runnerId),
      queryKey: getListRunnerBlocksQueryKey(),
    },
  });
  const deleteRunnerBlock = useDeleteRunnerBlock();
  const createRunnerReport = useCreateRunnerReport();
  const updateRunner = useUpdateRunner();
  const requestUploadUrl = useRequestUploadUrl();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<CreateRunnerReportBodyReason>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const isOwnProfile = currentRunner?.runnerId === id;
  const connection = connectionsQuery.data?.find(
    (item) =>
      (item.fromRunnerId === currentRunner?.runnerId && item.toRunnerId === id) ||
      (item.fromRunnerId === id && item.toRunnerId === currentRunner?.runnerId),
  );

  const changePublicListing = (checked: boolean) => {
    updateRunner.mutate({ id, data: { publicListing: checked } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRunnerQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetFeaturedRunnersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListRunnersQueryKey() });
        toast({ title: checked ? "Public listing enabled" : "Public listing disabled" });
      },
      onError: () => toast({ title: "Could not update public listing", variant: "destructive" }),
    });
  };

  const uploadProfilePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !runner) return;

    if (!isSupportedProfilePhotoType(file.type)) {
      toast({
        title: "Choose a JPEG, PNG, or WebP photo",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: "Photo is too large",
        description: "Choose an image up to 8 MiB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { uploadURL, objectPath } =
        await requestUploadUrl.mutateAsync({
          data: {
            name: file.name || "profile-photo",
            size: file.size,
            contentType: file.type,
          },
        });
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("The image upload did not complete.");
      }

      await updateRunner.mutateAsync({
        id: runner.id,
        data: { avatarUrl: `/api/storage${objectPath}?v=${Date.now()}` },
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getGetRunnerQueryKey(runner.id),
        }),
        queryClient.invalidateQueries({
          queryKey: getGetCurrentRunnerQueryKey(),
        }),
        queryClient.invalidateQueries({ queryKey: getListRunnersQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getGetFeaturedRunnersQueryKey(),
        }),
      ]);
      toast({ title: "Profile photo updated" });
    } catch (error) {
      toast({
        title: "Could not update profile photo",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleMessage = () => {
    const currentRunnerId = currentRunner?.runnerId;
    if (currentRunnerId == null || currentRunnerId === id) return;
    navigate(`/messages/${id}`);
  };

  const handleConnect = (type: CreateConnectionBodyType) => {
    createConnection.mutate({
      data: {
        toRunnerId: id,
        type: type,
        message: "Hey! I'd love to connect."
      }
    }, {
      onSuccess: () => {
        trackEvent("connection_request_sent", { mode: type });
        toast({
          title: "Connection request sent!",
          description: `Your ${type} request has been sent to ${runner?.name}.`,
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Could not send request. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleUnfriend = async () => {
    if (!connection || connection.status !== "accepted") return;
    if (!window.confirm(`Remove ${runner?.name ?? "this runner"} from your connections?`)) return;
    try {
      await deleteConnection.mutateAsync({ id: connection.id });
      await queryClient.invalidateQueries();
      toast({ title: "Connection removed" });
    } catch (error) {
      toast({
        title: "Could not remove this connection",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBlock = async () => {
    if (!currentRunner?.runnerId || isOwnProfile) return;
    if (!window.confirm(`Block ${runner?.name ?? "this runner"}? When signed in, they can no longer access your profile or contact you through RunBuddy. Public profile pages may still be visible to signed-out visitors.`)) return;
    try {
      await createRunnerBlock.mutateAsync({ data: { blockedRunnerId: id } });
      await queryClient.invalidateQueries();
      toast({ title: "Runner blocked", description: "They can no longer find or message you." });
      navigate("/run-buddy");
    } catch (error) {
      toast({
        title: "Could not block this runner",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUnblock = async (blockedRunnerId: number) => {
    try {
      await deleteRunnerBlock.mutateAsync({ runnerId: blockedRunnerId });
      await queryClient.invalidateQueries();
      toast({ title: "Runner unblocked" });
    } catch (error) {
      toast({
        title: "Could not unblock this runner",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReport = async () => {
    try {
      await createRunnerReport.mutateAsync({
        data: {
          reportedRunnerId: id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        },
      });
      setReportOpen(false);
      setReportDetails("");
      toast({ title: "Report submitted", description: "The report has been recorded for review. This runner won’t be notified." });
    } catch (error) {
      toast({
        title: "Could not submit report",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
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
  const isClub = runner.profileType !== "individual";
  const displayName = isClub ? runner.clubName || runner.name : runner.name;
  const profileTypeLabel = runner.profileType === "official_club" ? "Official running club" : runner.profileType === "social_club" ? "Social running club" : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow">
        <div className="bg-muted/30 border-b border-border/50 py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex flex-col items-center gap-3">
                <img
                  src={resolveAvatarUrl(runner.avatarUrl) || defaultAvatar}
                  alt={displayName}
                  className="w-48 h-48 object-cover rounded-2xl shadow-xl border-4 border-background"
                />
                {isOwnProfile && (
                  <div className="w-48 space-y-2 text-center">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={uploadProfilePhoto}
                      aria-label="Choose a profile photo"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-full"
                      disabled={isUploadingAvatar || updateRunner.isPending}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {isUploadingAvatar ? "Uploading…" : runner.avatarUrl ? "Change photo" : "Add photo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, or WebP, up to 8 MiB. Anyone with the image link can view it.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">{displayName}</h1>
                  {!isClub && runner.age && <span className="text-3xl text-muted-foreground font-light">{runner.age}</span>}
                </div>
                {profileTypeLabel && (
                  <Badge className="mb-3 rounded-full bg-primary/15 text-primary hover:bg-primary/15">
                    {profileTypeLabel}
                  </Badge>
                )}
                
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
                  {currentRunner?.runnerId != null && !isOwnProfile && (runner.lookingFor === 'buddy' || runner.lookingFor === 'both') && (
                    <Button
                      onClick={() => handleConnect('buddy')}
                      disabled={createConnection.isPending}
                      className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {createConnection.isPending ? "Sending..." : "Connect for Buddy"}
                    </Button>
                  )}
                  {currentRunner?.runnerId != null && !isOwnProfile && (
                    <Button onClick={handleMessage} variant="outline" className="rounded-full border-border">
                      <MessageSquare className="w-4 h-4 mr-2" /> Send Message
                    </Button>
                  )}
                  {currentRunner?.runnerId != null && !isOwnProfile && (
                    <>
                      {connection?.status === "accepted" && (
                        <Button
                          onClick={handleUnfriend}
                          variant="outline"
                          className="rounded-full border-border"
                          disabled={deleteConnection.isPending}
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          {deleteConnection.isPending ? "Removing…" : "Unfriend"}
                        </Button>
                      )}
                      <Button
                        onClick={handleBlock}
                        variant="outline"
                        className="rounded-full border-border"
                        disabled={createRunnerBlock.isPending}
                      >
                        <ShieldBan className="w-4 h-4 mr-2" />
                        Block
                      </Button>
                      <Button
                        onClick={() => setReportOpen((open) => !open)}
                        variant="ghost"
                        className="rounded-full"
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Report
                      </Button>
                    </>
                  )}
                  {reportOpen && (
                    <Card className="w-full text-left">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Report this runner</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Choose a reason. This runner won’t be notified.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <label className="block space-y-2 text-sm font-medium">
                          Reason
                          <select
                            value={reportReason}
                            onChange={(event) => setReportReason(event.target.value as CreateRunnerReportBodyReason)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2"
                          >
                            <option value="spam">Spam or scam</option>
                            <option value="harassment">Harassment or bullying</option>
                            <option value="impersonation">Impersonation</option>
                            <option value="inappropriate_content">Inappropriate content</option>
                            <option value="unsafe_behavior">Unsafe behavior</option>
                            <option value="other">Something else</option>
                          </select>
                        </label>
                        <label className="block space-y-2 text-sm font-medium">
                          Details (optional)
                          <textarea
                            value={reportDetails}
                            onChange={(event) => setReportDetails(event.target.value.slice(0, 2000))}
                            maxLength={2000}
                            rows={4}
                            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Add details that may help us review the report."
                          />
                        </label>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleReport}
                            disabled={createRunnerReport.isPending}
                          >
                            {createRunnerReport.isPending ? "Submitting…" : "Submit report"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {isCurrentRunnerError && (
                    <p role="alert" className="w-full text-sm text-destructive">
                      We couldn’t verify your runner profile. Sign in again or refresh the page to connect.
                    </p>
                  )}
                  {currentRunner?.runnerId === null && (
                    <div className="w-full flex flex-wrap items-center gap-3">
                      <p className="text-sm text-muted-foreground">
                        Create a runner profile with this account to connect or message other runners.
                      </p>
                      <Button variant="outline" onClick={() => navigate("/create-profile")}>
                        Create my profile
                      </Button>
                    </div>
                  )}
                  {isOwnProfile && (
                    <div className="w-full space-y-3">
                      <p role="status" className="text-sm text-muted-foreground">
                        This is your profile. Open another runner’s profile to connect or message them.
                      </p>
                      <div className="flex items-start gap-3 rounded-lg border bg-background p-4">
                        <Checkbox id="public-listing" checked={runner.publicListing === true} disabled={updateRunner.isPending} onCheckedChange={(checked) => changePublicListing(checked === true)} />
                        <div>
                          <label htmlFor="public-listing" className="cursor-pointer text-sm font-medium">List my profile publicly</label>
                          <p className="mt-1 text-xs text-muted-foreground">Anyone, including search engines, can see your name, city, country, club name, experience and running-partner preference. Your bio, travel plans, tracking links, contact information and messages remain private. Turn this off to remove your public listing.</p>
                        </div>
                      </div>
                      {blockedRunnersQuery.data && blockedRunnersQuery.data.length > 0 && (
                        <div className="rounded-lg border bg-background p-4">
                          <h2 className="font-semibold">Blocked runners</h2>
                          <ul className="mt-3 space-y-2">
                            {blockedRunnersQuery.data.map((block) => {
                              const blockedRunner = block.blockedRunner;
                              const blockedName = blockedRunner?.profileType === "individual"
                                ? blockedRunner.name
                                : blockedRunner?.clubName || blockedRunner?.name || `Runner #${block.blockedRunnerId}`;
                              return (
                                <li key={block.id} className="flex items-center justify-between gap-3 text-sm">
                                  <span className="truncate">{blockedName}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={deleteRunnerBlock.isPending}
                                    onClick={() => void handleUnblock(block.blockedRunnerId)}
                                  >
                                    Unblock
                                  </Button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {currentRunner?.runnerId != null &&
                    !isOwnProfile &&
                    runner.lookingFor !== "buddy" &&
                    runner.lookingFor !== "both" && (
                      <p role="status" className="w-full text-sm text-muted-foreground">
                        This runner isn’t looking for a buddy, but you can still send them a message.
                      </p>
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
                  {isClub ? runner.clubDescription || runner.bio || "This club hasn't written a description yet." : runner.bio || "This runner hasn't written a bio yet."}
                </p>
              </section>

              {isClub && runner.profileType === "official_club" && runner.clubAssociation && (
                <section>
                  <h2 className="text-2xl font-display font-bold mb-4">Official Registration</h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Registered with {runner.clubAssociation}.
                  </p>
                </section>
              )}

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
                  {runner.trackingApps?.appleHealthConnected && (
                    <div className="rounded-lg border p-3">
                      <span className="block font-medium text-foreground">Apple Health / Apple Watch</span>
                      <span className="mt-1 block text-xs text-muted-foreground">Runner-reported profile label; no workout data is synced.</span>
                    </div>
                  )}
                  {!runner.trackingApps?.stravaUrl && !runner.trackingApps?.garminUrl && !runner.trackingApps?.nikeRunClubUrl && !runner.trackingApps?.appleHealthConnected && (
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
