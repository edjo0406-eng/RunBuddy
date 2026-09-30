import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateConnection,
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
  const updateConnection = useUpdateConnection();
  const [actionError, setActionError] = useState<string | null>(null);
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
        </View>

        {runner.runningStats ? (
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Running details</Text>
            <View style={styles.statRow}>
              {typeof runner.runningStats.weeklyMileageKm === 'number' ? (
                <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{Math.round(runner.runningStats.weeklyMileageKm)} km</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>per week</Text>
                </View>
              ) : null}
              {runner.runningStats.avgPacePerKm ? (
                <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{runner.runningStats.avgPacePerKm}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>average pace</Text>
                </View>
              ) : null}
              {runner.runningStats.personalBest5k ? (
                <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{runner.runningStats.personalBest5k}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>5K best</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
        {trackingNames.length > 0 ? (
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Running accounts</Text>
            <View style={styles.pills}>{trackingNames.map((name) => <Pill key={name} label={name} />)}</View>
          </View>
        ) : null}
      </ScrollView>
    </Page>
  );
}

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
  stat: { minWidth: 95, flexGrow: 1, padding: 12, borderRadius: 14, gap: 3 },
  statValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
  statLabel: { fontFamily: 'Manrope_500Medium', fontSize: 11 },
  actionError: { alignSelf: 'stretch', fontFamily: 'Manrope_600SemiBold', fontSize: 12, textAlign: 'center' },
  respondRow: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', gap: 9 },
  requestStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 14 },
  requestStatusText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
});