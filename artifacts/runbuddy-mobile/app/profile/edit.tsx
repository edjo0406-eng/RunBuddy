import React, { useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useClerk } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import {
  getGetRunnerQueryKey,
  useDeleteCurrentRunner,
  useGetRunner,
  useRequestUploadUrl,
  useUpdateRunner,
  type Runner,
  type TrackingApps,
  type UploadUrlRequestContentType,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useRunnerIdentity } from '@/hooks/useRunnerIdentity';
import { CountryPickerField } from '@/components/CountryPickerField';
import {
  RunningDetailsFields,
  runningDetailsFromStats,
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
  RunnerAvatar,
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

function isSupportedProfilePhotoType(
  value: string,
): value is UploadUrlRequestContentType {
  return value === 'image/jpeg' || value === 'image/png' || value === 'image/webp';
}

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
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const updateRunner = useUpdateRunner();
  const requestUploadUrl = useRequestUploadUrl();
  const deleteCurrentRunner = useDeleteCurrentRunner();
  const [name, setName] = useState(runner.name);
  const [city, setCity] = useState(runner.city ?? '');
  const [country, setCountry] = useState(runner.country ?? '');
  const [bio, setBio] = useState(runner.bio ?? '');
  const [experience, setExperience] = useState(runner.experience ?? 'intermediate');
  const [runningDetails, setRunningDetails] = useState<RunningDetailsInput>(() =>
    runningDetailsFromStats(runner.runningStats),
  );
  const [publicListing, setPublicListing] = useState(Boolean(runner.publicListing));
  const [tracker, setTracker] = useState<TrackerKey>(() =>
    getInitialTracker(runner.trackingApps),
  );
  const [trackingApps, setTrackingApps] = useState<TrackingApps>(
    runner.trackingApps ?? {},
  );
  const [trackingAppsEdited, setTrackingAppsEdited] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const [photoSettingsRequired, setPhotoSettingsRequired] = useState(false);
  const trackerLink = getTrackerLink(trackingApps, tracker);
  const appleHealthConnected = Boolean(trackingApps.appleHealthConnected);
  const validTrackerLink =
    !trackerLink.trim() ||
    tracker === 'wahooPlan' ||
    /^https?:\/\/\S+/i.test(trackerLink.trim());

  const save = async () => {
    setFeedback(null);
    const runningDetailsError = validateRunningDetails(runningDetails);
    if (runningDetailsError) {
      setFeedback(runningDetailsError);
      return;
    }
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
          runningStats: runningStatsFromInput(runningDetails),
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

  const chooseProfilePhoto = async () => {
    setPhotoFeedback(null);
    setPhotoSettingsRequired(false);

    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setPhotoFeedback('Allow photo library access to choose a profile photo.');
          setPhotoSettingsRequired(!permission.canAskAgain);
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const candidateContentType = asset.mimeType ?? 'image/jpeg';
      if (!isSupportedProfilePhotoType(candidateContentType)) {
        setPhotoFeedback('Choose a JPEG, PNG, or WebP image.');
        return;
      }
      const contentType = candidateContentType;

      const uploadFile = new File(asset.uri);
      const size = asset.fileSize ?? uploadFile.size;
      if (!size || size > 8 * 1024 * 1024) {
        setPhotoFeedback('Choose an image up to 8 MiB.');
        return;
      }

      setIsUploadingPhoto(true);
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: {
          name: asset.fileName ?? 'profile-photo.jpg',
          size,
          contentType,
        },
      });
      const uploadResponse = await expoFetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: uploadFile,
      });
      if (!uploadResponse.ok) {
        throw new Error('The photo upload did not complete.');
      }

      await updateRunner.mutateAsync({
        id: runner.id,
        data: { avatarUrl: `/api/storage${objectPath}?v=${Date.now()}` },
      });
      await queryClient.invalidateQueries();
      setPhotoFeedback('Profile photo updated.');
    } catch (error) {
      setPhotoFeedback(errorMessage(error, 'Your profile photo could not be updated.'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const openPhotoSettings = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Linking.openSettings();
    } catch {
      setPhotoFeedback('Open your device settings and allow RunBuddy to access photos.');
    }
  };

  const deleteAccount = async () => {
    setDeleteFeedback(null);
    try {
      await deleteCurrentRunner.mutateAsync();
    } catch (error) {
      setDeleteFeedback(errorMessage(error, 'Your account could not be deleted. Please try again.'));
      return;
    }

    queryClient.clear();
    try {
      await clerk.signOut();
    } catch {
      setDeleteFeedback(
        'Your account was deleted, but this device could not clear its session. Close and reopen RunBuddy.',
      );
      return;
    }
    router.replace('/(tabs)/profile');
  };

  const confirmAccountDeletion = () => setDeleteConfirmationVisible(true);

  return (
    <View style={styles.formWrapper}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <RunnerAvatar uri={runner.avatarUrl} gender={runner.gender} size={72} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Profile photo
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a profile photo"
              accessibilityState={{
                disabled: isUploadingPhoto || updateRunner.isPending || requestUploadUrl.isPending,
              }}
              testID="edit-profile-photo"
              disabled={isUploadingPhoto || updateRunner.isPending || requestUploadUrl.isPending}
              onPress={() => void chooseProfilePhoto()}
              style={({ pressed }) => ({ opacity: pressed || isUploadingPhoto ? 0.65 : 1 })}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {isUploadingPhoto ? 'Uploading…' : runner.avatarUrl ? 'Change photo' : 'Add photo'}
              </Text>
            </Pressable>
          </View>
        </View>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>
          JPEG, PNG, or WebP, up to 8 MiB. Anyone with the image link can view it.
        </Text>
        {photoFeedback ? (
          <Text
            accessibilityRole={photoSettingsRequired ? 'alert' : undefined}
            accessibilityLiveRegion="polite"
            style={[
              styles.helper,
              { color: photoSettingsRequired ? colors.destructive : colors.mutedForeground },
            ]}
          >
            {photoFeedback}
          </Text>
        ) : null}
        {photoSettingsRequired && Platform.OS !== 'web' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void openPhotoSettings()}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              Open device settings
            </Text>
          </Pressable>
        ) : null}
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
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="Show Apple Health and Apple Watch as a profile tracker"
            accessibilityState={{ checked: appleHealthConnected }}
            testID="edit-apple-health-profile-toggle"
            onPress={() => {
              setTrackingAppsEdited(true);
              setTrackingApps((current) => ({
                ...current,
                appleHealthConnected: !current.appleHealthConnected,
              }));
            }}
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
        <RunningDetailsFields
          value={runningDetails}
          onChange={(nextValue) => {
            setRunningDetails(nextValue);
            setFeedback(null);
          }}
          testIDPrefix="edit-running"
        />
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
          disabled={name.trim().length < 2 || isUploadingPhoto}
          icon="check"
          testID="save-profile-changes"
        />
      </View>
      <View style={[styles.dangerCard, { backgroundColor: colors.card, borderColor: colors.destructive }]}>
        <View style={styles.dangerHeading}>
          <Feather name="alert-triangle" size={17} color={colors.destructive} />
          <Text style={[styles.dangerTitle, { color: colors.foreground }]}>Delete account</Text>
        </View>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>
          Permanently remove your RunBuddy account, profile, connections, and messages.
        </Text>
        {deleteFeedback ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
            {deleteFeedback}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete your RunBuddy profile and account"
          accessibilityState={{ disabled: deleteCurrentRunner.isPending }}
          testID="delete-runbuddy-account"
          disabled={deleteCurrentRunner.isPending}
          onPress={confirmAccountDeletion}
          style={({ pressed }) => [
            styles.deleteButton,
            {
              backgroundColor: colors.destructive,
              opacity: pressed || deleteCurrentRunner.isPending ? 0.76 : 1,
            },
          ]}
        >
          <Feather
            name="trash-2"
            size={16}
            color={colors.destructiveForeground}
          />
          <Text style={[styles.deleteButtonText, { color: colors.destructiveForeground }]}>
            {deleteCurrentRunner.isPending ? 'Deleting account…' : 'Delete profile and account'}
          </Text>
        </Pressable>
      </View>
      </KeyboardAwareScrollViewCompat>
      <Modal
        visible={deleteConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmationVisible(false)}
      >
        <View style={styles.confirmationOverlay}>
          <View
            accessibilityViewIsModal
            accessibilityLabel="Confirm deletion of your RunBuddy account"
            style={[
              styles.confirmationCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.confirmationHeader}>
              <Feather name="alert-triangle" size={20} color={colors.destructive} />
              <Text style={[styles.confirmationTitle, { color: colors.foreground }]}>
                Delete your RunBuddy account?
              </Text>
            </View>
            <Text style={[styles.confirmationBody, { color: colors.mutedForeground }]}>
              This permanently deletes your account, runner profile, linked running-account details,
              connections, and all messages you sent or received. Messages and connections will also
              disappear for the other runners. This cannot be undone.
            </Text>
            <View style={styles.confirmationActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDeleteConfirmationVisible(false)}
                style={[
                  styles.confirmationButton,
                  styles.cancelButton,
                  { borderColor: colors.border },
                ]}
              >
                <Text style={[styles.confirmationButtonText, { color: colors.foreground }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm delete everything"
                disabled={deleteCurrentRunner.isPending}
                onPress={() => {
                  setDeleteConfirmationVisible(false);
                  void deleteAccount();
                }}
                style={[
                  styles.confirmationButton,
                  {
                    backgroundColor: colors.destructive,
                    opacity: deleteCurrentRunner.isPending ? 0.76 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.confirmationButtonText,
                    { color: colors.destructiveForeground },
                  ]}
                >
                  Delete everything
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  formWrapper: { flex: 1 },
  topBar: { height: 44, paddingHorizontal: 20, justifyContent: 'center' },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  gate: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 14 },
  formCard: { borderWidth: 1, borderRadius: 24, padding: 17, gap: 17 },
  dangerCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  dangerHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dangerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
  deleteButton: { minHeight: 46, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deleteButtonText: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  confirmationOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(11, 20, 24, 0.62)' },
  confirmationCard: { width: '100%', maxWidth: 440, borderWidth: 1, borderRadius: 24, padding: 20, gap: 16 },
  confirmationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmationTitle: { flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 19, lineHeight: 25 },
  confirmationBody: { fontFamily: 'Manrope_500Medium', fontSize: 14, lineHeight: 21 },
  confirmationActions: { flexDirection: 'row', gap: 10 },
  confirmationButton: { flex: 1, minHeight: 48, borderRadius: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { borderWidth: 1 },
  confirmationButtonText: { textAlign: 'center', fontFamily: 'Manrope_700Bold', fontSize: 13 },
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