import { trackEvent } from "@/lib/analytics";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateRunner, CreateRunnerBodyLookingFor, CreateRunnerBodyExperience, CreateRunnerBodyProfileType } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIdentity } from "@/hooks/use-identity";

const RUN_TYPES = ["road", "trail", "track", "treadmill", "ultra"] as const;
const TIME_PATTERN = /^(?:\d{1,2}:)?\d{1,2}:[0-5]\d$/;

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  publicListing: z.boolean(),
  age: z.coerce.number().min(18).max(100).optional().or(z.literal("")),
  bio: z.string().max(500).optional(),
  city: z.string().min(2),
  country: z.string().min(2),
  gender: z.string().optional(),
  profileType: z.enum(["individual", "social_club", "official_club"]),
  clubName: z.string().optional(),
  clubDescription: z.string().max(500).optional(),
  clubWebsite: z.string().url("Enter a valid website URL.").optional().or(z.literal("")),
  clubSocialUrl: z.string().url("Enter a valid social link.").optional().or(z.literal("")),
  clubAssociation: z.string().optional(),
  lookingFor: z.literal("buddy"),
  experience: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  trackingApps: z.object({
    stravaUrl: z.string(),
    garminUrl: z.string(),
    nikeRunClubUrl: z.string(),
    polarUrl: z.string(),
    suuntoUrl: z.string(),
    wahooPlan: z.string(),
    appleHealthConnected: z.boolean(),
  }).refine(
    (apps) => Object.values(apps).some((value) =>
      typeof value === "string" ? value.trim().length > 0 : value === true
    ),
    { message: "Select at least one tracking app." }
  ),
  weeklyMileageKm: z.union([z.literal(""), z.coerce.number().min(0).max(500)]),
  totalRaces: z.union([z.literal(""), z.coerce.number().int().min(0).max(5000)]),
  avgPacePerKm: z.string().trim().max(8).refine((value) => !value || TIME_PATTERN.test(value), {
    message: "Use mm:ss or h:mm:ss.",
  }),
  personalBest5k: z.string().trim().max(8).refine((value) => !value || TIME_PATTERN.test(value), {
    message: "Use mm:ss or h:mm:ss.",
  }),
  personalBest10k: z.string().trim().max(8).refine((value) => !value || TIME_PATTERN.test(value), {
    message: "Use mm:ss or h:mm:ss.",
  }),
  personalBestHalfMarathon: z.string().trim().max(8).refine((value) => !value || TIME_PATTERN.test(value), {
    message: "Use mm:ss or h:mm:ss.",
  }),
  personalBestMarathon: z.string().trim().max(8).refine((value) => !value || TIME_PATTERN.test(value), {
    message: "Use mm:ss or h:mm:ss.",
  }),
  preferredRunTypes: z.array(z.enum(RUN_TYPES)),
}).superRefine((values, ctx) => {
  if (values.profileType !== "individual" && !values.clubName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["clubName"],
      message: "Club name is required."
    });
  }
  if (values.profileType === "official_club" && !values.clubAssociation?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["clubAssociation"],
      message: "Registered athletics association is required for official clubs."
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setMyRunnerId } = useIdentity();
  const createRunner = useCreateRunner();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      publicListing: false,
      age: "",
      bio: "",
      city: "",
      country: "",
      gender: "",
      profileType: "individual",
      clubName: "",
      clubDescription: "",
      clubWebsite: "",
      clubSocialUrl: "",
      clubAssociation: "",
      lookingFor: "buddy",
      experience: "intermediate",
      trackingApps: {
        stravaUrl: "",
        garminUrl: "",
        nikeRunClubUrl: "",
        polarUrl: "",
        suuntoUrl: "",
        wahooPlan: "",
        appleHealthConnected: false,
      },
      weeklyMileageKm: "",
      totalRaces: "",
      avgPacePerKm: "",
      personalBest5k: "",
      personalBest10k: "",
      personalBestHalfMarathon: "",
      personalBestMarathon: "",
      preferredRunTypes: [],
    },
  });
  const profileType = form.watch("profileType");

  const onSubmit = (values: FormValues) => {
    createRunner.mutate({
      data: {
        name: values.name,
        publicListing: values.publicListing,
        age: values.age ? Number(values.age) : null,
        bio: values.bio,
        city: values.city,
        country: values.country,
        gender: values.gender,
        profileType: values.profileType as CreateRunnerBodyProfileType,
        clubName: values.clubName || null,
        clubDescription: values.clubDescription || null,
        clubWebsite: values.clubWebsite || null,
        clubSocialUrl: values.clubSocialUrl || null,
        clubAssociation: values.clubAssociation || null,
        lookingFor: values.lookingFor as CreateRunnerBodyLookingFor,
        experience: values.experience as CreateRunnerBodyExperience,
        trackingApps: values.trackingApps,
        runningStats: {
          weeklyMileageKm: values.weeklyMileageKm === "" ? null : Number(values.weeklyMileageKm),
          totalRaces: values.totalRaces === "" ? null : Number(values.totalRaces),
          avgPacePerKm: values.avgPacePerKm || null,
          personalBest5k: values.personalBest5k || null,
          personalBest10k: values.personalBest10k || null,
          personalBestHalfMarathon: values.personalBestHalfMarathon || null,
          personalBestMarathon: values.personalBestMarathon || null,
          preferredRunTypes: values.preferredRunTypes.length ? values.preferredRunTypes : null,
        }
      }
    }, {
      onSuccess: (runner) => {
        setMyRunnerId(runner.id);
        trackEvent("profile_created");
        toast({
          title: "Profile Created!",
          description: "Welcome to the community. Get ready to hit the pavement.",
        });
        setLocation(`/runner/${runner.id}`);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Could not create profile. Please check your inputs.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold mb-2 tracking-tight">Join the Community</h1>
            <p className="text-muted-foreground text-lg">Create your runner profile and find your next running companion.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-2xl">Basic Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Eliud Kipchoge" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="28" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="Berlin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <FormControl>
                            <Input placeholder="Germany" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell the community about your running journey..." 
                            className="resize-none h-32"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          A brief intro about yourself and your running goals.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profileType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Joining as *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a profile type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="individual">Individual runner</SelectItem>
                            <SelectItem value="social_club">Social running club</SelectItem>
                            <SelectItem value="official_club">Official running club</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Official clubs should be registered with an athletics association.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {profileType !== "individual" && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">Club Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="clubName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Club Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Sunday Miles Club" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clubDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>About the Club</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell runners what your club is about..."
                              className="resize-none h-28"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="clubWebsite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://yourclub.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clubSocialUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Social Link</FormLabel>
                            <FormControl>
                              <Input placeholder="https://instagram.com/yourclub" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {profileType === "official_club" && (
                      <FormField
                        control={form.control}
                        name="clubAssociation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registered Athletics Association *</FormLabel>
                            <FormControl>
                              <Input placeholder="National Athletics Federation" {...field} />
                            </FormControl>
                            <FormDescription>
                              Official club profiles identify the athletics association they are registered with.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-2xl">Preferences & Running Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lookingFor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Looking For *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select intent" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="buddy">Running partners</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                              <SelectItem value="elite">Elite</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="weeklyMileageKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weekly Mileage (km)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="40" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="avgPacePerKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Average Pace (min/km)</FormLabel>
                          <FormControl>
                            <Input placeholder="5:30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Running details are optional and appear on your profile for signed-in runners.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="totalRaces"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Races</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="5000" step="1" placeholder="12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="personalBest5k"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>5K Personal Best</FormLabel>
                          <FormControl>
                            <Input placeholder="25:30" maxLength={8} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="personalBest10k"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>10K Personal Best</FormLabel>
                          <FormControl>
                            <Input placeholder="52:00" maxLength={8} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="personalBestHalfMarathon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Half Marathon Personal Best</FormLabel>
                          <FormControl>
                            <Input placeholder="1:55:00" maxLength={8} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="personalBestMarathon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marathon Personal Best</FormLabel>
                          <FormControl>
                            <Input placeholder="4:10:00" maxLength={8} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="preferredRunTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Run Types</FormLabel>
                        <FormDescription>Select any terrain or format you enjoy.</FormDescription>
                        <div className="flex flex-wrap gap-3">
                          {RUN_TYPES.map((runType) => (
                            <label
                              key={runType}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                            >
                              <Checkbox
                                checked={field.value.includes(runType)}
                                onCheckedChange={(checked) =>
                                  field.onChange(
                                    checked === true
                                      ? [...field.value, runType]
                                      : field.value.filter((value) => value !== runType),
                                  )
                                }
                              />
                              <span className="capitalize">{runType}</span>
                            </label>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trackingApps"
                    render={() => (
                      <FormItem className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <FormLabel className="font-display text-lg">Tracking Apps *</FormLabel>
                        <FormDescription>
                          Add at least one app so runners can find you and compare routes or pace.
                        </FormDescription>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="trackingApps.stravaUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Strava</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://strava.com/athletes/..." {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="trackingApps.garminUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Garmin Connect</FormLabel>
                                <FormControl>
                                  <Input placeholder="Profile link" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="trackingApps.nikeRunClubUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nike Run Club</FormLabel>
                                <FormControl>
                                  <Input placeholder="Profile link" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="trackingApps.polarUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Polar</FormLabel>
                                <FormControl>
                                  <Input placeholder="Profile link" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="trackingApps.suuntoUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Suunto</FormLabel>
                                <FormControl>
                                  <Input placeholder="Profile link" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="trackingApps.wahooPlan"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Wahoo</FormLabel>
                                <FormControl>
                                  <Input placeholder="Training plan or profile link" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="trackingApps.appleHealthConnected"
                          render={({ field }) => (
                            <FormItem className="mt-4 flex items-center gap-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer font-normal">Show Apple Health / Apple Watch on my profile</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <FormField
                    control={form.control}
                    name="publicListing"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel className="cursor-pointer">List my profile publicly</FormLabel>
                          <FormDescription>
                            Optional. Anyone, including search engines, can see your name, city, country, club name (if applicable), experience level and running-partner preference. Your bio, travel plans, tracking links, contact information and messages will not appear in the public directory. You can turn this off from your profile.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full md:w-auto font-display font-bold tracking-wide rounded-full px-12"
                  disabled={createRunner.isPending}
                >
                  {createRunner.isPending ? "Creating..." : "Create Profile"}
                </Button>
              </div>

            </form>
          </Form>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
