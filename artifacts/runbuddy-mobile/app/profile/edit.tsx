import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import {
  getGetRunnerQueryKey,
  useGetRunner,
  useUpdateRunner,
  type Runner,
  type TrackingApps,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useRunnerIdentity } from '@/hooks/useRunnerIdentity';
import { CountryPickerField } from '@/components/CountryPickerField';
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

const trackers: { key: TrackerKey; label: string }[] = [
  { key: 'stravaUrl', label: 'Strava' },
  { key: 'garminUrl', label: 'Garmin' },
  { key: 'nikeRunClubUrl', label: 'Nike Run Club' },
  { key: 'polarUrl', label: 'Polar' },
  { key: 'suuntoUrl', label: 'Suunto' },
  { key: 'wahooPlan', label: 'Wahoo' },
];

function getTrackerLink(apps: TrackingApps | null | undefined, key: TrackerKey) {
  if (key === 'garminUrl') return apps?.garminUrl ?? apps?.garminConnectUrl ?? '';
  return apps?.[key] ?? '';
}

function getInitialTracker(apps: TrackingApps | null | undefined): TrackerKey {
  return (
    trackers.find(({ key }) => Boolean(getTrackerLink(apps, key).trim()))?.key ??
    'stravaUrl'
  );
}

function EditProfileForm({ runner }: { runner: Runner }) {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateRunner = useUpdateRunner();
  const [name, setName] = useState(runner.name);
  const [city, setCity] = useState(runner.city ?? '');
  const [country, setCountry] = useState(runner.country ?? '');
  const [bio, setBio] = useState(runner.bio ?? '');
  const [experience, setExperience] = useState(runner.experience ?? 'intermediate');
  const [publicListing, setPublicListing] = useState(Boolean(runner.publicListing));
  const [tracker, setTracker] = useState<TrackerKey>(() =>
    getInitialTracker(runner.trackingApps),
  );
  const [trackingApps, setTrackingApps] = useState<TrackingApps>(
    runner.trackingApps ?? {},
  );
  const [trackingAppsEdited, setTrackingAppsEdited] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const trackerLink = getTrackerLink(trackingApps, tracker);
  const validTrackerLink =
    !trackerLink.trim() ||
    tracker === 'wahooPlan' ||
    /^https?:\/\/\S+/i.test(trackerLink.trim());

  const save = async () => {
    setFeedback(null);
    if (trackingAppsEdited && !validTrackerLink) {
      setFeedback('Use a full link starting with https://.');
      return;
    }
    try {
      const nextTrackingApps: TrackingApps = {
        ...trackingApps,
        [tracker]: trackerLink.trim() || null,
      };
      if (tracker === 'garminUrl' && !trackerLink.trim()) {
        nextTrackingApps.garminConnectUrl = null;
      }
      await updateRunner.mutateAsync({
        id: runner.id,
        data: {
          name: name.trim(),
          city: city.trim() || null,
          country: country.trim() || null,
          bio: bio.trim() || null,
          experience,
          publicListing,
          ...(trackingAppsEdited ? { trackingApps: nextTrackingApps } : {}),
        },
      });
      await queryClient.invalidateQueries();
      router.back();
    } catch (error) {
      setFeedback(errorMessage(error, 'Your profile could not be saved.'));
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <BrandHeader
        eyebrow="RUNNER PROFILE"
        title="Keep it current."
        subtitle="Update your details and choose whether to appear in discovery."
      />
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" testID="edit-name" />
        <View style={styles.locationFields}>
          <TextField
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Bristol"
            autoCapitalize="words"
            testID="edit-city"
          />
          <CountryPickerField
            value={country}
            onChange={setCountry}
            testID="edit-country"
          />
        </View>
        <TextField
          label="A little about your runs"
          value={bio}
          onChangeText={setBio}
          placeholder="Routes, goals, favourite post-run snack…"
          multiline
          maxLength={500}
          testID="edit-bio"
        />
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Running account
          </Text>
          <View style={styles.pills}>
            {trackers.map((option) => (
              <Pill
                key={option.key}
                label={option.label}
                selected={tracker === option.key}
                onPress={() => setTracker(option.key)}
                testID={`edit-tracker-${option.key}`}
              />
            ))}
          </View>
          <TextField
            label="Profile link"
            value={trackerLink}
            onChangeText={(value) => {
              setTrackingAppsEdited(true);
              setTrackingApps((current) => ({ ...current, [tracker]: value }))
            }}
            placeholder={tracker === 'wahooPlan' ? 'Your Wahoo plan or profile' : 'Paste your public profile link'}
            autoCapitalize="none"
            keyboardType={tracker === 'wahooPlan' ? 'default' : 'url'}
            autoComplete="url"
            testID="edit-tracking-account-link"
          />
          {trackingAppsEdited && !validTrackerLink && trackerLink.trim() ? (
            <Text style={[styles.helper, { color: colors.destructive }]}>
              Use a full link starting with https://.
            </Text>
          ) : null}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Experience</Text>
          <View style={styles.pills}>
            {(['beginner', 'intermediate', 'advanced', 'elite'] as const).map((level) => (
              <Pill
                key={level}
                label={level.charAt(0).toUpperCase() + level.slice(1)}
                selected={experience === level}
                onPress={() => setExperience(level)}
                testID={`edit-experience-${level}`}
              />
            ))}
          </View>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: publicListing }}
          testID="edit-public-listing"
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
            <Text style={[styles.label, { color: colors.foreground }]}>Public runner discovery</Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              {publicListing ? 'Other runners can find your profile.' : 'Your profile stays hidden from discovery.'}
            </Text>
          </View>
        </Pressable>
        {feedback ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{feedback}</Text> : null}
        <ActionButton
          title="Save changes"
          onPress={save}
          loading={updateRunner.isPending}
          disabled={name.trim().length < 2}
          icon="check"
          testID="save-profile-changes"
        />
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const identity = useRunnerIdentity();
  const runnerId = identity.runnerId ?? 0;
  const runnerQuery = useGetRunner(identity.runnerId ?? 0, {
    query: {
      queryKey: getGetRunnerQueryKey(runnerId),
      enabled: Boolean(identity.signedIn && identity.runnerId),
    },
  });

  return (
    <Page>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Feather name="arrow-left" size={20} />
        </Pressable>
      </View>
      {!identity.signedIn ? (
        <View style={styles.gate}>
          <EmptyState
            icon="lock"
            title="Sign in to edit your profile"
            detail="Your profile settings are connected to your RunBuddy account."
            action={<ActionButton title="Sign in" onPress={() => router.push('/(auth)/sign-in')} icon="arrow-right" />}
          />
        </View>
      ) : identity.isPending || runnerQuery.isPending ? (
        <LoadingState label="Loading your profile…" />
      ) : identity.isError || runnerQuery.isError ? (
        <ErrorState message="Your profile could not be loaded." onRetry={() => void runnerQuery.refetch()} />
      ) : !identity.runnerId || !runnerQuery.data ? (
        <View style={styles.gate}>
          <EmptyState
            icon="user-plus"
            title="Create your runner profile first"
            detail="Once your profile is set up, you can edit your details here."
            action={<ActionButton title="Set up my profile" onPress={() => router.replace('/onboarding')} icon="arrow-right" />}
          />
        </View>
      ) : (
        <EditProfileForm runner={runnerQuery.data} />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  topBar: { height: 44, paddingHorizontal: 20, justifyContent: 'center' },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  gate: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 14 },
  formCard: { borderWidth: 1, borderRadius: 24, padding: 17, gap: 17 },
  locationFields: { gap: 14 },
  fieldGroup: { gap: 10 },
  label: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  privacyCard: { borderWidth: 1, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  checkBox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  privacyCopy: { flex: 1, gap: 4 },
  helper: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 17 },
  error: { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
});