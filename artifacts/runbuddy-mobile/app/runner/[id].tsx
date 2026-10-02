import React, { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateConnection,
  useCreateRunnerBlock,
  useCreateRunnerReport,
  getGetRunnerQueryKey,
  getListConnectionsQueryKey,
  useGetRunner,
  useListConnections,
  useUpdateConnection,
  type Connection,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useRunnerIdentity } from '@/hooks/useRunnerIdentity';
import {
  ActionButton,
  EmptyState,
  ErrorState,
  LoadingState,
  Page,
  Pill,
  RunnerAvatar,
  errorMessage,
  experienceLabel,
  locationLabel,
} from '@/components/ui';

function isWebProfileUrl(value?: string | null): value is string {
  return Boolean(value && /^https?:\/\/\S+/i.test(value.trim()));
}

function connectionFor(connections: Connection[], runnerId: number, otherId: number) {
  return connections.find(
    (connection) =>
      (connection.fromRunnerId === runnerId && connection.toRunnerId === otherId) ||
      (connection.fromRunnerId === otherId && connection.toRunnerId === runnerId),
  );
}

export default function RunnerDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const runnerId = Number(params.id);
  const validId = Number.isInteger(runnerId) && runnerId > 0;
  const identity = useRunnerIdentity();
  const profileId = validId ? runnerId : 0;
  const runnerQuery = useGetRunner(validId ? runnerId : 0, {
    query: {
      queryKey: getGetRunnerQueryKey(profileId),
      enabled: validId,
    },
  });
  const connectionsQuery = useListConnections(undefined, {
    query: {
      queryKey: getListConnectionsQueryKey(),
      enabled: Boolean(identity.signedIn && identity.runnerId && validId),
    },
  });
  const createConnection = useCreateConnection();
  const createRunnerBlock = useCreateRunnerBlock();
  const createRunnerReport = useCreateRunnerReport();
  const updateConnection = useUpdateConnection();
  const [actionError, setActionError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('spam');
  const [reportDetails, setReportDetails] = useState('');
  const runner = runnerQuery.data;
  const ownProfile = Boolean(identity.runnerId && runner?.id === identity.runnerId);
  const connection =
    identity.runnerId && runner
      ? connectionFor(connectionsQuery.data ?? [], identity.runnerId, runner.id)
      : undefined;
  const displayName =
    runner?.profileType === 'individual'
      ? runner.name
      : runner?.clubName || runner?.name || 'RunBuddy runner';

  const sendRequest = async () => {
    if (!runner) return;
    setActionError(null);
    try {
      await createConnection.mutateAsync({
        data: { toRunnerId: runner.id, type: 'buddy' },
      });
      await queryClient.invalidateQueries();
    } catch (error) {
      setActionError(errorMessage(error, 'Your buddy request could not be sent.'));
    }
  };

  const respond = async (status: 'accepted' | 'declined') => {
    if (!connection) return;
    setActionError(null);
    try {
      await updateConnection.mutateAsync({ id: connection.id, data: { status } });
      await queryClient.invalidateQueries();
    } catch (error) {
      setActionError(errorMessage(error, 'That request could not be updated.'));
    }
  };

  const performBlock = async () => {
    if (!runner) return;
    setActionError(null);
    try {
      await createRunnerBlock.mutateAsync({ data: { blockedRunnerId: runner.id } });
      await queryClient.invalidateQueries();
      router.replace('/(tabs)/connections');
    } catch (error) {
      setActionError(errorMessage(error, 'This runner could not be blocked.'));
    }
  };

  const confirmBlock = () => {
    if (!runner) return;
    Alert.alert(
      `Block ${displayName}?`,
      'While signed in, they will no longer be able to view your profile, find you in RunBuddy, or message you. Your connection will be removed. Public profile pages can still be viewed by signed-out visitors.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block runner', style: 'destructive', onPress: () => void performBlock() },
      ],
    );
  };

  const submitReport = async () => {
    if (!runner) return;
    setActionError(null);
    try {
      await createRunnerReport.mutateAsync({
        data: {
          reportedRunnerId: runner.id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        },
      });
      setReportOpen(false);
      setReportDetails('');
      Alert.alert('Report submitted', 'The report has been recorded for review. This runner won’t be notified.');
    } catch (error) {
      setActionError(errorMessage(error, 'Your report could not be submitted.'));
    }
  };

  if (!validId) {
    return (
      <Page>
        <View style={styles.gate}>
          <EmptyState icon="user-x" title="Runner not found" detail="The profile link is not valid." action={<ActionButton title="Back to discovery" onPress={() => router.replace('/(tabs)')} icon="search" />} />
        </View>
      </Page>
    );
  }

  if (runnerQuery.isPending) return <Page><LoadingState label="Loading runner profile…" /></Page>;
  if (runnerQuery.isError || !runner) {
    return <Page><View style={styles.gate}><ErrorState message="This runner profile could not be loaded." onRetry={() => void runnerQuery.refetch()} /></View></Page>;
  }

  const connectionAction = () => {
    if (!identity.signedIn) {
      return <ActionButton title="Sign in to connect" onPress={() => router.push('/(auth)/sign-in')} icon="arrow-right" />;
    }
    if (!identity.runnerId) {
      return <ActionButton title="Create your runner profile" onPress={() => router.push('/onboarding')} icon="arrow-right" />;
    }
    if (ownProfile) {
      return <ActionButton title="Edit my profile" onPress={() => router.push('/profile/edit')} variant="outline" icon="edit-3" />;
    }
    if (connectionsQuery.isError) {
      return <ErrorState message="We could not check your connection status." onRetry={() => void connectionsQuery.refetch()} />;
    }
    if (connectionsQuery.isPending) {
      return <LoadingState label="Checking connection status…" />;
    }
    if (!connection) {
      return <ActionButton title="Send a buddy request" onPress={sendRequest} loading={createConnection.isPending} icon="user-plus" testID="send-buddy-request" />;
    }
    if (connection.status === 'accepted') {
      return (
        <ActionButton
          title="Message this runner"
          onPress={() => router.push({ pathname: '/conversation/[otherId]', params: { otherId: String(runner.id) } })}
          icon="message-circle"
        />
      );
    }
    if (connection.status === 'pending' && connection.toRunnerId === identity.runnerId) {
      return (
        <View style={styles.respondRow}>
          <ActionButton title="Decline" variant="outline" icon="x" compact onPress={() => respond('declined')} loading={updateConnection.isPending} />
          <ActionButton title="Accept request" icon="check" compact onPress={() => respond('accepted')} loading={updateConnection.isPending} />
        </View>
      );
    }
    if (connection.status === 'pending') {
      return (
        <View style={[styles.requestStatus, { backgroundColor: colors.muted }]}>
          <Feather name="clock" size={16} color={colors.mutedForeground} />
          <Text style={[styles.requestStatusText, { color: colors.mutedForeground }]}>Buddy request sent</Text>
        </View>
      );
    }
    return (
      <View style={[styles.requestStatus, { backgroundColor: colors.muted }]}>
        <Feather name="user-x" size={16} color={colors.mutedForeground} />
        <Text style={[styles.requestStatusText, { color: colors.mutedForeground }]}>This request was declined</Text>
      </View>
    );
  };

  const trackingNames = [
    runner.trackingApps?.stravaUrl ? 'Strava' : null,
    runner.trackingApps?.garminUrl || runner.trackingApps?.garminConnectUrl ? 'Garmin' : null,
    runner.trackingApps?.nikeRunClubUrl ? 'Nike Run Club' : null,
    runner.trackingApps?.polarUrl ? 'Polar' : null,
    runner.trackingApps?.suuntoUrl ? 'Suunto' : null,
    runner.trackingApps?.wahooPlan ? 'Wahoo' : null,
    runner.trackingApps?.appleHealthConnected ? 'Apple Health' : null,
  ].filter((item): item is string => Boolean(item));
  const trackingUrls: Record<string, string | undefined> = {
    Strava: runner.trackingApps?.stravaUrl ?? undefined,
    Garmin: runner.trackingApps?.garminUrl ?? runner.trackingApps?.garminConnectUrl ?? undefined,
    'Nike Run Club': runner.trackingApps?.nikeRunClubUrl ?? undefined,
    Polar: runner.trackingApps?.polarUrl ?? undefined,
    Suunto: runner.trackingApps?.suuntoUrl ?? undefined,
    Wahoo: runner.trackingApps?.wahooPlan ?? undefined,
  };
  const hasRunningProfileLinks = trackingNames.some((name) =>
    isWebProfileUrl(trackingUrls[name]),
  );

  const openRunningProfile = (name: string, url: string) => {
    if (!isWebProfileUrl(url)) return;
    void Linking.openURL(url.trim()).catch(() => {
      setActionError(`We couldn't open the ${name} profile link.`);
    });
  };

  return (
    <Page>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <RunnerAvatar uri={runner.avatarUrl} gender={runner.gender} size={96} />
          <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={15} color={colors.mutedForeground} />
            <Text style={[styles.location, { color: colors.mutedForeground }]}>
              {locationLabel(runner.city, runner.country) || 'Location not shared'}
            </Text>
          </View>
          <View style={styles.pills}>
            <Pill label={experienceLabel(runner.experience)} />
            {runner.profileType !== 'individual' ? <Pill label="Running club" /> : null}
            {runner.age ? <Pill label={`${runner.age}`} /> : null}
          </View>
          {runner.bio ? <Text style={[styles.bio, { color: colors.foreground }]}>{runner.bio}</Text> : null}
          {actionError ? <Text accessibilityRole="alert" style={[styles.actionError, { color: colors.destructive }]}>{actionError}</Text> : null}
          {connectionAction()}
          {identity.signedIn && identity.runnerId && !ownProfile ? (
            <View style={styles.safetyActions}>
              <ActionButton
                title="Block runner"
                variant="outline"
                icon="slash"
                onPress={confirmBlock}
                loading={createRunnerBlock.isPending}
                testID="block-runner"
              />
              <ActionButton
                title="Report"
                variant="outline"
                icon="flag"
                onPress={() => setReportOpen(true)}
                testID="report-runner"
              />
            </View>
          ) : null}
        </View>

        {runner.runningStats &&
        (runner.runningStats.weeklyMileageKm != null ||
          runner.runningStats.totalRaces != null ||
          Boolean(runner.runningStats.avgPacePerKm) ||
          Boolean(runner.runningStats.personalBest5k) ||
          Boolean(runner.runningStats.personalBest10k) ||
          Boolean(runner.runningStats.personalBestHalfMarathon) ||
          Boolean(runner.runningStats.personalBestMarathon) ||
          Boolean(runner.runningStats.preferredRunTypes?.length)) ? (
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Running details</Text>
            <View style={styles.statRow}>
              {typeof runner.runningStats.weeklyMileageKm === 'number' ? (
                <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {Number.isInteger(runner.runningStats.weeklyMileageKm)
                      ? runner.runningStats.weeklyMileageKm
                      : runner.runningStats.weeklyMileageKm.toFixed(1)} km
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>per week</Text>
                </View>
              ) : null}
              {runner.runningStats.avgPacePerKm ? (
                <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{runner.runningStats.avgPacePerKm}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>average pace</Text>
                </View>
              ) : null}
              {typeof runner.runningStats.totalRaces === 'number' ? (
                <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{runner.runningStats.totalRaces}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>races</Text>
                </View>
              ) : null}
              {runner.runningStats.personalBest5k ? (
                <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{runner.runningStats.personalBest5k}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>5K best</Text>
                </View>
              ) : null}
              {runner.runningStats.personalBest10k ? (
                <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{runner.runningStats.personalBest10k}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>10K best</Text>
                </View>
              ) : null}
              {runner.runningStats.personalBestHalfMarathon ? (
                <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{runner.runningStats.personalBestHalfMarathon}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>half marathon</Text>
                </View>
              ) : null}
              {runner.runningStats.personalBestMarathon ? (
                <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{runner.runningStats.personalBestMarathon}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>marathon</Text>
                </View>
              ) : null}
            </View>
            {runner.runningStats.preferredRunTypes?.length ? (
              <View style={styles.statRow}>
                {runner.runningStats.preferredRunTypes.map((runType) => (
                  <Pill key={runType} label={runType} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
        {trackingNames.length > 0 ? (
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Running accounts</Text>
            <View style={styles.pills}>
              {trackingNames.map((name) => {
                const url = trackingUrls[name];
                return isWebProfileUrl(url) ? (
                  <Pressable
                    key={name}
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${name} running profile`}
                    testID={`open-running-profile-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    onPress={() => openRunningProfile(name, url)}
                    style={({ pressed }) => [
                      styles.accountLink,
                      {
                        backgroundColor: colors.muted,
                        borderColor: colors.border,
                        opacity: pressed ? 0.78 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.accountLinkText, { color: colors.foreground }]}>
                      View {name} profile
                    </Text>
                    <Feather name="external-link" size={14} color={colors.mutedForeground} />
                  </Pressable>
                ) : (
                  <Pill key={name} label={name} />
                );
              })}
            </View>
            {hasRunningProfileLinks ? (
              <Text style={[styles.linkNote, { color: colors.mutedForeground }]}>
                Links are shared by the runner and are not independently verified.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <Modal
        visible={reportOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReportOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.reportSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Report this runner</Text>
            <Text style={[styles.reportHint, { color: colors.mutedForeground }]}>
              Choose the reason that best fits. This runner won’t be notified.
            </Text>
            <View style={styles.reportReasons}>
              {REPORT_REASONS.map((reason) => {
                const selected = reportReason === reason.value;
                return (
                  <Pressable
                    key={reason.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setReportReason(reason.value)}
                    style={[
                      styles.reportReason,
                      {
                        backgroundColor: selected ? colors.primary : colors.muted,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.reportReasonText, { color: selected ? colors.primaryForeground : colors.foreground }]}>
                      {reason.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={reportDetails}
              onChangeText={(value) => setReportDetails(value.slice(0, 2000))}
              placeholder="Add details (optional)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={2000}
              textAlignVertical="top"
              style={[
                styles.reportInput,
                { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border },
              ]}
            />
            <View style={styles.respondRow}>
              <ActionButton title="Cancel" variant="outline" compact onPress={() => setReportOpen(false)} />
              <ActionButton
                title="Submit report"
                compact
                onPress={() => void submitReport()}
                loading={createRunnerReport.isPending}
                testID="submit-runner-report"
              />
            </View>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

type ReportReason =
  | 'spam'
  | 'harassment'
  | 'impersonation'
  | 'inappropriate_content'
  | 'unsafe_behavior'
  | 'other';

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or scam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'unsafe_behavior', label: 'Unsafe behavior' },
  { value: 'other', label: 'Something else' },
];

const styles = StyleSheet.create({
  topBar: { height: 44, paddingHorizontal: 20, justifyContent: 'center' },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  gate: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28, gap: 13 },
  heroCard: { borderWidth: 1, borderRadius: 26, alignItems: 'center', padding: 22, gap: 12 },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 25, textAlign: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  location: { fontFamily: 'Manrope_500Medium', fontSize: 13 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 },
  bio: { alignSelf: 'stretch', fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 2 },
  detailCard: { borderWidth: 1, borderRadius: 22, padding: 17, gap: 13 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accountLink: { minHeight: 36, paddingHorizontal: 13, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  accountLinkText: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  linkNote: { fontFamily: 'Manrope_400Regular', fontSize: 11, lineHeight: 16 },
  stat: { minWidth: 95, flexGrow: 1, padding: 12, borderRadius: 14, gap: 3 },
  statValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
  statLabel: { fontFamily: 'Manrope_500Medium', fontSize: 11 },
  actionError: { alignSelf: 'stretch', fontFamily: 'Manrope_600SemiBold', fontSize: 12, textAlign: 'center' },
  safetyActions: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 2 },
  respondRow: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', gap: 9 },
  requestStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 14 },
  requestStatusText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
  reportSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 14 },
  reportHint: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  reportReasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reportReason: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  reportReasonText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  reportInput: { minHeight: 92, maxHeight: 180, borderWidth: 1, borderRadius: 14, padding: 12, fontFamily: 'Manrope_400Regular', fontSize: 14 },
});