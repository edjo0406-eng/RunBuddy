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
import { useCreateRunner, CreateRunnerBodyLookingFor, CreateRunnerBodyExperience } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z.coerce.number().min(18).max(100).optional().or(z.literal("")),
  bio: z.string().max(500).optional(),
  city: z.string().min(2),
  country: z.string().min(2),
  gender: z.string().optional(),
  lookingFor: z.enum(["date", "buddy", "both"]),
  experience: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  weeklyMileageKm: z.coerce.number().optional().or(z.literal("")),
  avgPacePerKm: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createRunner = useCreateRunner();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      age: "",
      bio: "",
      city: "",
      country: "",
      gender: "",
      lookingFor: "buddy",
      experience: "intermediate",
      weeklyMileageKm: "",
      avgPacePerKm: ""
    },
  });

  const onSubmit = (values: FormValues) => {
    createRunner.mutate({
      data: {
        name: values.name,
        age: values.age ? Number(values.age) : null,
        bio: values.bio,
        city: values.city,
        country: values.country,
        gender: values.gender,
        lookingFor: values.lookingFor as CreateRunnerBodyLookingFor,
        experience: values.experience as CreateRunnerBodyExperience,
        runningStats: {
          weeklyMileageKm: values.weeklyMileageKm ? Number(values.weeklyMileageKm) : null,
          avgPacePerKm: values.avgPacePerKm || null
        }
      }
    }, {
      onSuccess: (runner) => {
        toast({
          title: "Profile Created!",
          description: "Welcome to RunDate. Get ready to hit the pavement.",
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
            <p className="text-muted-foreground text-lg">Create your RunDate profile to find running buddies and dates.</p>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-2xl">Preferences & Stats</CardTitle>
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
                              <SelectItem value="date">Dates (RunDate)</SelectItem>
                              <SelectItem value="buddy">Partners (RunBuddy)</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
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
