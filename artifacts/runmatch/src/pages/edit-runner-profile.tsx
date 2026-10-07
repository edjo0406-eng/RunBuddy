import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/react";
import {
  getGetFeaturedRunnersQueryKey,
  getGetCurrentRunnerQueryKey,
  getGetRunnerQueryKey,
  getListRunnersQueryKey,
  type Runner,
  type UpdateRunnerBody,
  useGetCurrentRunner,
  useGetRunner,
  useUpdateRunner,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Check, Footprints, MapPin, Save } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const RUN_TYPES = ["road", "trail", "track", "treadmill", "ultra"] as const;
const TIME_PATTERN = /^(?:\d{1,2}:[0-5]\d|\d{1,2}:[0-5]\d:[0-5]\d)$/;
const optionalUrl = z.string().trim().max(500).refine(
  (value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
    } catch {
      return false;
    }
  },
  "Enter a full http:// or https:// URL.",
);
const optionalTime = z.string().trim().max(8).refine(
  (value) => !value || TIME_PATTERN.test(value),
  "Use mm:ss or h:mm:ss.",
);

export const runnerProfileEditSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(100, "Keep the name under 100 characters."),
  age: z.union([z.literal(""), z.coerce.number().int().min(18).max(100)]),
  gender: z.string().trim().max(50),
  city: z.string().trim().min(2, "City must be at least 2 characters.").max(100),
  country: z.string().trim().min(2, "Country must be at least 2 characters.").max(100),
  bio: z.string().max(500, "Bio must be 500 characters or fewer."),
  profileType: z.enum(["individual", "social_club", "official_club"]),
  clubName: z.string().trim().max(120),
  clubDescription: z.string().max(500, "Club description must be 500 characters or fewer."),
  clubWebsite: optionalUrl,
  clubSocialUrl: optionalUrl,
  clubAssociation: z.string().trim().max(160),
  lookingFor: z.enum(["date", "buddy", "both"]),
  experience: z.enum(["beginner", "intermediate", "advanced", "elite", ""]),
  weeklyMileageKm: z.union([z.literal(""), z.coerce.number().min(0).max(500)]),
  totalRaces: z.union([z.literal(""), z.coerce.number().int().min(0).max(5000)]),
  avgPacePerKm: optionalTime,
  personalBest5k: optionalTime,
  personalBest10k: optionalTime,
  personalBestHalfMarathon: optionalTime,
  personalBestMarathon: optionalTime,
  preferredRunTypes: z.array(z.enum(RUN_TYPES)),
  trackingApps: z.object({
    stravaUrl: optionalUrl,
    garminUrl: optionalUrl,
    nikeRunClubUrl: optionalUrl,
    polarUrl: optionalUrl,
    suuntoUrl: optionalUrl,
    wahooPlan: z.string().trim().max(500),
    appleHealthConnected: z.boolean(),
  }),
  travelCity: z.string().trim().max(100),
  travelCountry: z.string().trim().max(100),
  travelUntil: z.string().trim().max(80),
  travelNote: z.string().max(300),
}).superRefine((values, context) => {
  if (values.profileType !== "individual" && !values.clubName.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["clubName"], message: "Club name is required for a club profile." });
  }
  if (values.profileType === "official_club" && !values.clubAssociation.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["clubAssociation"], message: "Add the registered association for an official club." });
  }
});

type FormValues = z.infer<typeof runnerProfileEditSchema>;

export function runnerToFormValues(runner: Runner): FormValues {
  return {
    name: runner.name ?? "",
    age: runner.age ?? "",
    gender: runner.gender ?? "",
    city: runner.city ?? "",
    country: runner.country ?? "",
    bio: runner.bio ?? "",
    profileType: runner.profileType ?? "individual",
    clubName: runner.clubName ?? "",
    clubDescription: runner.clubDescription ?? "",
    clubWebsite: runner.clubWebsite ?? "",
    clubSocialUrl: runner.clubSocialUrl ?? "",
    clubAssociation: runner.clubAssociation ?? "",
    lookingFor: runner.lookingFor ?? "buddy",
    experience: runner.experience ?? "",
    weeklyMileageKm: runner.runningStats?.weeklyMileageKm ?? "",
    totalRaces: runner.runningStats?.totalRaces ?? "",
    avgPacePerKm: runner.runningStats?.avgPacePerKm ?? "",
    personalBest5k: runner.runningStats?.personalBest5k ?? "",
    personalBest10k: runner.runningStats?.personalBest10k ?? "",
    personalBestHalfMarathon: runner.runningStats?.personalBestHalfMarathon ?? "",
    personalBestMarathon: runner.runningStats?.personalBestMarathon ?? "",
    preferredRunTypes: (runner.runningStats?.preferredRunTypes ?? []).filter(
      (type): type is typeof RUN_TYPES[number] => RUN_TYPES.includes(type as typeof RUN_TYPES[number]),
    ),
    trackingApps: {
      stravaUrl: runner.trackingApps?.stravaUrl ?? "",
      garminUrl: runner.trackingApps?.garminUrl ?? runner.trackingApps?.garminConnectUrl ?? "",
      nikeRunClubUrl: runner.trackingApps?.nikeRunClubUrl ?? "",
      polarUrl: runner.trackingApps?.polarUrl ?? "",
      suuntoUrl: runner.trackingApps?.suuntoUrl ?? "",
      wahooPlan: runner.trackingApps?.wahooPlan ?? "",
      appleHealthConnected: runner.trackingApps?.appleHealthConnected === true,
    },
    travelCity: runner.travelCity ?? "",
    travelCountry: runner.travelCountry ?? "",
    travelUntil: runner.travelUntil ?? "",
    travelNote: runner.travelNote ?? "",
  };
}

export function runnerEditBodyFromForm(
  values: FormValues,
  runner: Runner,
): UpdateRunnerBody {
  const garminUrl = values.trackingApps.garminUrl.trim() || null;

  return {
    name: values.name,
    age: values.age === "" ? null : Number(values.age),
    gender: values.gender.trim() || null,
    city: values.city,
    country: values.country,
    bio: values.bio.trim() || null,
    profileType: values.profileType,
    clubName: values.clubName.trim() || null,
    clubDescription: values.clubDescription.trim() || null,
    clubWebsite: values.clubWebsite.trim() || null,
    clubSocialUrl: values.clubSocialUrl.trim() || null,
    clubAssociation: values.clubAssociation.trim() || null,
    lookingFor: values.lookingFor,
    experience: values.experience || null,
    trackingApps: {
      ...(runner.trackingApps ?? {}),
      stravaUrl: values.trackingApps.stravaUrl.trim() || null,
      garminUrl,
      garminConnectUrl: garminUrl,
      nikeRunClubUrl: values.trackingApps.nikeRunClubUrl.trim() || null,
      polarUrl: values.trackingApps.polarUrl.trim() || null,
      suuntoUrl: values.trackingApps.suuntoUrl.trim() || null,
      wahooPlan: values.trackingApps.wahooPlan.trim() || null,
      appleHealthConnected: values.trackingApps.appleHealthConnected,
    },
    runningStats: {
      ...(runner.runningStats ?? {}),
      weeklyMileageKm: values.weeklyMileageKm === "" ? null : Number(values.weeklyMileageKm),
      totalRaces: values.totalRaces === "" ? null : Number(values.totalRaces),
      avgPacePerKm: values.avgPacePerKm || null,
      personalBest5k: values.personalBest5k || null,
      personalBest10k: values.personalBest10k || null,
      personalBestHalfMarathon: values.personalBestHalfMarathon || null,
      personalBestMarathon: values.personalBestMarathon || null,
      preferredRunTypes: values.preferredRunTypes.length ? values.preferredRunTypes : null,
    },
    travelCity: values.travelCity.trim() || null,
    travelCountry: values.travelCountry.trim() || null,
    travelUntil: values.travelUntil.trim() || null,
    travelNote: values.travelNote.trim() || null,
  };
}

function LoadingScreen() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <Skeleton className="mb-8 h-5 w-36" />
        <Skeleton className="mb-3 h-12 w-2/3" />
        <Skeleton className="mb-10 h-5 w-1/2" />
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </main>
    </div>
  );
}

function AccessMessage({ title, detail, onBack }: { title: string; detail: string; onBack: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Navbar />
      <main className="mx-auto flex max-w-3xl px-4 py-16 md:px-8">
        <Card className="w-full overflow-hidden rounded-3xl border-border/70 shadow-sm">
          <div className="h-2 bg-secondary" />
          <CardContent className="px-7 py-10 md:px-10">
            <p className="font-mono-label mb-3 text-xs text-muted-foreground">MEMBER SETTINGS / PRIVATE</p>
            <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
            <p role="status" data-testid="status-profile-access" className="mt-3 max-w-xl text-muted-foreground">{detail}</p>
            <Button type="button" variant="outline" className="mt-7 rounded-full" data-testid="button-back-profile" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to profile
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export default function EditRunnerProfile() {
  const params = useParams();
  const id = Number(params.id);
  const validId = Number.isSafeInteger(id) && id > 0;
  const { isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const runnerQuery = useGetRunner(validId ? id : 0, {
    query: { enabled: validId, queryKey: getGetRunnerQueryKey(validId ? id : 0) },
  });
  const currentQuery = useGetCurrentRunner({
    query: { enabled: isSignedIn === true, queryKey: getGetCurrentRunnerQueryKey() },
  });
  const updateRunner = useUpdateRunner();
  const runner = runnerQuery.data;
  const isOwner = runner?.id === currentQuery.data?.runnerId && runner?.id != null;

  const form = useForm<FormValues>({
    resolver: zodResolver(runnerProfileEditSchema),
    defaultValues: {
      name: "", age: "", gender: "", city: "", country: "", bio: "",
      profileType: "individual", clubName: "", clubDescription: "", clubWebsite: "",
      clubSocialUrl: "", clubAssociation: "", lookingFor: "buddy", experience: "",
      weeklyMileageKm: "", totalRaces: "", avgPacePerKm: "",
      personalBest5k: "", personalBest10k: "", personalBestHalfMarathon: "",
      personalBestMarathon: "", preferredRunTypes: [],
      trackingApps: {
        stravaUrl: "", garminUrl: "", nikeRunClubUrl: "", polarUrl: "",
        suuntoUrl: "", wahooPlan: "", appleHealthConnected: false,
      },
      travelCity: "", travelCountry: "", travelUntil: "", travelNote: "",
    },
    values: runner && isOwner ? runnerToFormValues(runner) : undefined,
  });
  const profileType = form.watch("profileType");

  const onSubmit = (values: FormValues) => {
    if (!runner || !isOwner) return;
    updateRunner.mutate({
      id,
      data: runnerEditBodyFromForm(values, runner),
      }, {
      onSuccess: async (updatedRunner) => {
        queryClient.setQueryData(getGetRunnerQueryKey(id), updatedRunner);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetRunnerQueryKey(id) }),
          queryClient.invalidateQueries({ queryKey: getGetCurrentRunnerQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListRunnersQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetFeaturedRunnersQueryKey() }),
        ]);
        toast({ title: "Profile saved", description: "Your updated details are saved and still visible here." });
      },
      onError: () => {
        toast({ title: "Could not save profile", description: "Check your connection and try again.", variant: "destructive" });
      },
    });
  };

  if (!validId) {
    return <AccessMessage title="Profile not found" detail="That profile address isn’t valid." onBack={() => navigate("/run-buddy")} />;
  }
  if (isSignedIn !== true) {
    if (isSignedIn === false) {
      return <AccessMessage title="Sign in to edit your profile" detail="Profile editing is available only to the signed-in owner." onBack={() => navigate(`/runner/${id}`)} />;
    }
    return <LoadingScreen />;
  }
  if (runnerQuery.isLoading || currentQuery.isLoading) return <LoadingScreen />;
  if (runnerQuery.isError || currentQuery.isError) {
    return <AccessMessage title="We couldn’t verify profile access" detail="Try again in a moment. Your profile stays private until ownership can be confirmed." onBack={() => navigate(`/runner/${id}`)} />;
  }
  if (!runner) {
    return <AccessMessage title="Profile unavailable" detail="This runner profile could not be found." onBack={() => navigate("/run-buddy")} />;
  }
  if (currentQuery.data?.runnerId == null) {
    return <AccessMessage title="No runner profile on this account" detail="The signed-in account does not have a RunBuddy runner profile to edit." onBack={() => navigate(`/runner/${id}`)} />;
  }
  if (!isOwner) {
    return <AccessMessage title="This profile isn’t yours to edit" detail="Only the owner can change these private profile details." onBack={() => navigate(`/runner/${id}`)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
        <Button type="button" variant="ghost" className="-ml-3 mb-7 rounded-full text-muted-foreground hover:text-foreground" data-testid="link-back-to-profile" onClick={() => navigate(`/runner/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Your profile
        </Button>
        <header className="relative mb-8 overflow-hidden rounded-[2rem] border border-border/70 bg-card px-6 py-8 shadow-sm md:px-10 md:py-10">
          <div className="pointer-events-none absolute -right-10 -top-12 h-56 w-56 rounded-full border-[26px] border-primary/20" />
          <div className="relative max-w-2xl">
            <p className="font-mono-label mb-3 text-xs text-muted-foreground">YOUR MEMBER DETAILS</p>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Tune your runner profile.</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              Give nearby and traveling runners a clear feel for your pace, your people, and the runs you enjoy.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent/60 px-3 py-1.5 text-xs font-semibold text-accent-foreground">
              <MapPin className="h-3.5 w-3.5" /> Private editing · changes belong to you
            </div>
          </div>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <Card className="rounded-3xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 px-6 py-5 md:px-8">
                <p className="font-mono-label text-[10px] text-secondary">01 / THE BASICS</p>
                <CardTitle className="font-display text-2xl">Who you are</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 px-6 py-6 md:px-8">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field form={form} name="name" label="Name" testId="input-name" placeholder="Your name" />
                  <Field form={form} name="age" label="Age" testId="input-age" type="number" placeholder="Optional, 18–100" />
                  <Field form={form} name="city" label="Home city" testId="input-city" placeholder="City" />
                  <Field form={form} name="country" label="Country" testId="input-country" placeholder="Country" />
                  <Field form={form} name="gender" label="Gender" testId="input-gender" placeholder="Optional" />
                  <FormField control={form.control} name="profileType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-profile-type"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Individual runner</SelectItem>
                          <SelectItem value="social_club">Social club</SelectItem>
                          <SelectItem value="official_club">Official club</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>About you</FormLabel>
                    <FormControl><Textarea data-testid="input-bio" rows={4} maxLength={500} className="resize-y" placeholder="A little about your running life…" {...field} /></FormControl>
                    <FormDescription>{field.value.length}/500 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {profileType !== "individual" && (
              <Card className="rounded-3xl border-primary/25 bg-primary/[0.045] shadow-sm">
                <CardHeader className="px-6 py-5 md:px-8">
                  <p className="font-mono-label text-[10px] text-secondary">02 / YOUR CLUB</p>
                  <CardTitle className="font-display text-2xl">Make the group easy to find</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 px-6 pb-7 md:px-8">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field form={form} name="clubName" label="Club name" testId="input-club-name" placeholder="The Saturday Loop" />
                    <Field form={form} name="clubAssociation" label="Association" testId="input-club-association" placeholder="Optional registration body" />
                    <Field form={form} name="clubWebsite" label="Website" testId="input-club-website" placeholder="https://yourclub.org" />
                    <Field form={form} name="clubSocialUrl" label="Social link" testId="input-club-social-url" placeholder="https://…" />
                  </div>
                  <FormField control={form.control} name="clubDescription" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Club description</FormLabel>
                      <FormControl><Textarea data-testid="input-club-description" maxLength={500} rows={3} className="resize-y" placeholder="What are your meetups like?" {...field} /></FormControl>
                      <FormDescription>{field.value.length}/500 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            <Card className="rounded-3xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 px-6 py-5 md:px-8">
                <p className="font-mono-label text-[10px] text-secondary">{profileType === "individual" ? "02" : "03"} / THE RUN</p>
                <CardTitle className="font-display text-2xl">Your rhythm & goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 px-6 py-6 md:px-8">
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField control={form.control} name="lookingFor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Looking for</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-looking-for"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="date">A running date</SelectItem>
                          <SelectItem value="buddy">A running buddy</SelectItem>
                          <SelectItem value="both">Open to either</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="experience" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                        value={field.value || "none"}
                      >
                        <FormControl><SelectTrigger data-testid="select-experience"><SelectValue placeholder="Choose a level" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="elite">Elite</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field form={form} name="weeklyMileageKm" label="Weekly distance (km)" testId="input-weekly-km" type="number" placeholder="e.g. 32" />
                  <Field form={form} name="totalRaces" label="Races completed" testId="input-total-races" type="number" placeholder="Optional" />
                  <Field form={form} name="avgPacePerKm" label="Average pace / km" testId="input-average-pace" placeholder="5:40" />
                </div>
                <div>
                  <h3 className="mb-3 font-display text-lg font-semibold">Personal bests <span className="font-sans text-sm font-normal text-muted-foreground">(mm:ss or h:mm:ss)</span></h3>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Field form={form} name="personalBest5k" label="5K" testId="input-pb-5k" placeholder="24:30" />
                    <Field form={form} name="personalBest10k" label="10K" testId="input-pb-10k" placeholder="51:20" />
                    <Field form={form} name="personalBestHalfMarathon" label="Half marathon" testId="input-pb-half" placeholder="1:52:00" />
                    <Field form={form} name="personalBestMarathon" label="Marathon" testId="input-pb-marathon" placeholder="4:05:00" />
                  </div>
                </div>
                <FormField control={form.control} name="preferredRunTypes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Run types you enjoy</FormLabel>
                    <FormDescription>Choose all that sound like your kind of miles.</FormDescription>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {RUN_TYPES.map((type) => {
                        const checked = field.value.includes(type);
                        return (
                          <label key={type} data-testid={`option-run-type-${type}`} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm capitalize transition-colors ${checked ? "border-primary/60 bg-primary/15 font-semibold" : "bg-background hover:bg-muted/60"}`}>
                            <Checkbox data-testid={`checkbox-run-type-${type}`} checked={checked} onCheckedChange={(value) => field.onChange(value === true ? [...field.value, type] : field.value.filter((item) => item !== type))} />
                            {type}
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 px-6 py-5 md:px-8">
                <p className="font-mono-label text-[10px] text-secondary">{profileType === "individual" ? "03" : "04"} / YOUR TOOLS</p>
                <CardTitle className="font-display text-2xl">Tracking accounts</CardTitle>
                <p className="text-sm text-muted-foreground">These are links you provide, not verified connections or synced data.</p>
              </CardHeader>
              <CardContent className="space-y-5 px-6 py-6 md:px-8">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field form={form} name="trackingApps.stravaUrl" label="Strava" testId="input-strava" placeholder="https://strava.com/athletes/…" />
                  <Field form={form} name="trackingApps.garminUrl" label="Garmin" testId="input-garmin" placeholder="https://…" />
                  <Field form={form} name="trackingApps.nikeRunClubUrl" label="Nike Run Club" testId="input-nike-run-club" placeholder="https://…" />
                  <Field form={form} name="trackingApps.polarUrl" label="Polar" testId="input-polar" placeholder="https://…" />
                  <Field form={form} name="trackingApps.suuntoUrl" label="Suunto" testId="input-suunto" placeholder="https://…" />
                  <Field form={form} name="trackingApps.wahooPlan" label="Wahoo" testId="input-wahoo" placeholder="Training plan or profile link" />
                </div>
                <FormField control={form.control} name="trackingApps.appleHealthConnected" render={({ field }) => (
                  <FormItem className="flex items-start gap-3 rounded-2xl border bg-muted/35 p-4">
                    <FormControl><Checkbox data-testid="checkbox-apple-health" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1">
                      <FormLabel className="cursor-pointer">I use Apple Health</FormLabel>
                      <FormDescription>This is self-reported only. RunBuddy does not connect to or sync Apple Health.</FormDescription>
                    </div>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 px-6 py-5 md:px-8">
                <p className="font-mono-label text-[10px] text-secondary">{profileType === "individual" ? "04" : "05"} / ON THE MOVE</p>
                <CardTitle className="font-display text-2xl">Travel plans</CardTitle>
                <p className="text-sm text-muted-foreground">Let runners know where you’ll be and when.</p>
              </CardHeader>
              <CardContent className="space-y-5 px-6 py-6 md:px-8">
                <div className="grid gap-5 md:grid-cols-3">
                  <Field form={form} name="travelCity" label="Travel city" testId="input-travel-city" placeholder="City" />
                  <Field form={form} name="travelCountry" label="Travel country" testId="input-travel-country" placeholder="Country" />
                  <Field form={form} name="travelUntil" label="Until" testId="input-travel-until" placeholder="e.g. 18 August" />
                </div>
                <FormField control={form.control} name="travelNote" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trip note</FormLabel>
                    <FormControl><Textarea data-testid="input-travel-note" rows={3} maxLength={300} className="resize-y" placeholder="Morning routes welcome; free after work." {...field} /></FormControl>
                    <FormDescription>{field.value.length}/300 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {updateRunner.isSuccess && (
              <div role="status" data-testid="status-profile-saved" className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium">
                <Check className="h-4 w-4" /> Saved. Your values remain on this page while you review them.
              </div>
            )}
            {updateRunner.isError && <p role="alert" data-testid="status-profile-save-error" className="text-sm text-destructive">Your profile could not be saved. Review the form and try again.</p>}
            <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden items-center gap-2 pl-2 text-xs text-muted-foreground sm:flex"><Footprints className="h-4 w-4 text-secondary" /> Your profile, in your own words.</p>
              <Button type="submit" data-testid="button-save-profile" disabled={updateRunner.isPending || !form.formState.isDirty} className="h-12 rounded-xl px-6 font-semibold">
                <Save className="mr-2 h-4 w-4" />
                {updateRunner.isPending ? "Saving your details…" : updateRunner.isSuccess ? "Save changes again" : "Save profile"}
              </Button>
            </div>
          </form>
        </Form>
      </main>
      <Footer />
    </div>
  );
}

type FieldName = keyof FormValues | `trackingApps.${keyof FormValues["trackingApps"]}`;
function Field({
  form,
  name,
  label,
  testId,
  placeholder,
  type = "text",
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  name: FieldName;
  label: string;
  testId: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <FormField control={form.control} name={name as never} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input
            data-testid={testId}
            type={type}
            min={type === "number" ? (name === "age" ? 18 : 0) : undefined}
            max={type === "number" ? (name === "age" ? 100 : name === "totalRaces" ? 5000 : 500) : undefined}
            step={name === "totalRaces" || name === "age" ? 1 : undefined}
            placeholder={placeholder}
            {...field}
            value={field.value ?? ""}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}
