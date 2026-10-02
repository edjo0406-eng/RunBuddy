import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useCreateRunner, type TrackingApps } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useRunnerIdentity } from '@/hooks/useRunnerIdentity';
import { CountryPickerField } from '@/components/CountryPickerField';
import {
  emptyRunningDetails,
  RunningDetailsFields,
  runningStatsFromInput,
  validateRunningDetails,
  type RunningDetailsInput,
} from '@/components/RunningDetailsFields';
import {
  ActionButton,
  BrandHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  Page,
  Pill,
  TextField,
  errorMessage,
} from '@/components/ui';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

type TrackerKey =
  | 'stravaUrl'
  | 'garminUrl'
  | 'nikeRunClubUrl'
  | 'polarUrl'
  | 'suuntoUrl'
  | 'wahooPlan';
type Experience = 'beginner' | 'intermediate' | 'advanced' | 'elite';

const trackers: { key: TrackerKey; label: string }[] = [
  { key: 'stravaUrl', label: 'Strava' },
  { key: 'garminUrl', label: 'Garmin' },
  { key: 'nikeRunClubUrl', label: 'Nike Run Club' },
  { key: 'polarUrl', label: 'Polar' },
  { key: 'suuntoUrl', label: 'Suunto' },
  { key: 'wahooPlan', label: 'Wahoo' },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const identity = useRunnerIdentity();
  const createRunner = useCreateRunner();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [tracker, setTracker] = useState<TrackerKey>('stravaUrl');
  const [trackerLink, setTrackerLink] = useState('');
  const [appleHealthConnected, setAppleHealthConnected] = useState(false);
  const [experience, setExperience] = useState<Experience>('intermediate');
  const [runningDetails, setRunningDetails] = useState<RunningDetailsInput>(emptyRunningDetails);
  const [publicListing, setPublicListing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (identity.runnerId) router.replace('/(tabs)/profile');
  }, [identity.runnerId, router]);

  const createProfile = async () => {
    setFeedback(null);
    const runningDetailsError = validateRunningDetails(runningDetails);
    if (runningDetailsError) {
      setFeedback(runningDetailsError);
      return;
    }
    const trackingApps: TrackingApps = {};
    if (trackerLink.trim()) trackingApps[tracker] = trackerLink.trim();
    if (appleHealthConnected) trackingApps.appleHealthConnected = true;
    try {
      await createRunner.mutateAsync({
        data: {
          name: name.trim(),
          city: city.trim(),
          country: country.trim(),
          profileType: 'individual',
          lookingFor: 'buddy',
          experience,
          runningStats: runningStatsFromInput(runningDetails),
          trackingApps,
          publicListing,
        },
      });
      await queryClient.invalidateQueries();
      router.replace('/(tabs)/profile');
    } catch (error) {
      setFeedback(errorMessage(error, 'Your profile could not be saved. Check your details and try again.'));
    }
  };

  const validTrackerLink =
    !trackerLink.trim() ||
    tracker === 'wahooPlan' ||
    /^https?:\/\/\S+/i.test(trackerLink.trim());
  const hasTracker = Boolean(trackerLink.trim()) || appleHealthConnected;
  const canCreate =
    name.trim().length >= 2 &&
    city.trim().length >= 2 &&
    country.trim().length >= 2 &&
    hasTracker &&
    validTrackerLink;

  return (
    <Page>
      {!identity.signedIn ? (
        <View style={styles.gate}>
          <EmptyState
            icon="lock"
            title="Sign in before setting up your profile"
            detail="Your running details are saved to your RunBuddy account."
            action={<ActionButton title="Sign in" onPress={() => router.push('/(auth)/sign-in')} icon="arrow-right" />}
          />
        </View>
      ) : identity.isPending ? (
        <LoadingState label="Checking your account…" />
      ) : identity.isError ? (
        <ErrorState message="We could not check whether you already have a runner profile." onRetry={() => void identity.refetch()} />
      ) : identity.runnerId ? (
        <LoadingState label="Opening your runner profile…" />
      ) : (
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <BrandHeader
            eyebrow="FIRST, THE BASICS"
            title="Make it yours."
            subtitle="Tell local runners a little about how you like to run."
          />
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextField
              label="Your name"
              value={name}
              onChangeText={setName}
              placeholder="How runners will know you"
              autoCapitalize="words"
              autoComplete="name"
              testID="profile-name"
            />
            <View style={styles.locationFields}>
              <TextField
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Bristol"
                autoCapitalize="words"
                testID="profile-city"
              />
              <CountryPickerField
                value={country}
                onChange={setCountry}
                testID="profile-country"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Your running experience</Text>
              <View style={styles.pills}>
                {(['beginner', 'intermediate', 'advanced', 'elite'] as const).map((level) => (
                  <Pill
                    key={level}
                    label={level.charAt(0).toUpperCase() + level.slice(1)}
                    selected={experience === level}
                    onPress={() => setExperience(level)}
                    testID={`experience-${level}`}
                  />
                ))}
              </View>
            </View>
            <RunningDetailsFields
              value={runningDetails}
              onChange={(nextValue) => {
                setRunningDetails(nextValue);
                setFeedback(null);
              }}
              testIDPrefix="setup-running"
            />
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Running account or tracker</Text>
              <View style={styles.pills}>
                {trackers.map((option) => (
                  <Pill
                    key={option.key}
                    label={option.label}
                    selected={tracker === option.key}
                    onPress={() => setTracker(option.key)}
                    testID={`tracker-${option.key}`}
                  />
                ))}
              </View>
              <TextField
                value={trackerLink}
                onChangeText={setTrackerLink}
                placeholder={tracker === 'wahooPlan' ? 'Your Wahoo plan or profile' : 'Paste your public profile link'}
                autoCapitalize="none"
                keyboardType={tracker === 'wahooPlan' ? 'default' : 'url'}
                autoComplete="url"
                testID="tracking-account-link"
              />
              {!validTrackerLink && trackerLink.trim() ? (
                <Text style={[styles.validation, { color: colors.destructive }]}>Use a full link starting with https://.</Text>
              ) : null}
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                Add a public running profile, or leave this blank if you choose Apple Health below.
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Show Apple Health and Apple Watch as a profile tracker"
                accessibilityState={{ checked: appleHealthConnected }}
                testID="apple-health-profile-toggle"
                onPress={() => setAppleHealthConnected((value) => !value)}
                style={({ pressed }) => [
                  styles.privacyCard,
                  {
                    backgroundColor: appleHealthConnected ? colors.accent : colors.muted,
                    borderColor: appleHealthConnected ? colors.accent : colors.border,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <View style={[styles.checkBox, { borderColor: colors.foreground, backgroundColor: appleHealthConnected ? colors.primary : 'transparent' }]}>
                  {appleHealthConnected ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}
                </View>
                <View style={styles.privacyCopy}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Show Apple Health / Apple Watch on my profile</Text>
                  <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                    Profile label only. RunBuddy won’t read or sync Health data.
                  </Text>
                </View>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: publicListing }}
              testID="public-listing-toggle"
              onPress={() => setPublicListing((value) => !value)}
              style={({ pressed }) => [
                styles.privacyCard,
                {
                  backgroundColor: publicListing ? colors.accent : colors.muted,
                  borderColor: publicListing ? colors.accent : colors.border,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <View style={[styles.checkBox, { borderColor: colors.foreground, backgroundColor: publicListing ? colors.primary : 'transparent' }]}>
                {publicListing ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}
              </View>
              <View style={styles.privacyCopy}>
                <Text style={[styles.label, { color: colors.foreground }]}>Show my profile in discovery</Text>
                <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                  Optional. Your profile stays private unless you turn this on.
                </Text>
              </View>
            </Pressable>
            {feedback ? (
              <Text accessibilityRole="alert" style={[styles.validation, { color: colors.destructive }]}>{feedback}</Text>
            ) : null}
            <ActionButton
              title="Save my runner profile"
              onPress={createProfile}
              loading={createRunner.isPending}
              disabled={!canCreate}
              icon="arrow-right"
              testID="create-runner-profile"
            />
          </View>
        </KeyboardAwareScrollViewCompat>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30, gap: 12 },
  formCard: { borderWidth: 1, borderRadius: 24, padding: 17, gap: 18 },
  locationFields: { gap: 14 },
  fieldGroup: { gap: 10 },
  label: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  helper: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 17 },
  validation: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 18 },
  privacyCard: { borderWidth: 1, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  checkBox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  privacyCopy: { flex: 1, gap: 4 },
});