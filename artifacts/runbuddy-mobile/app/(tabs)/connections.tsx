import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import {
  getListConnectionsQueryKey,
  useListConnections,
  useUpdateConnection,
  type Connection,
  type Runner,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useRunnerIdentity } from '@/hooks/useRunnerIdentity';
import {
  ActionButton,
  BrandHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  Page,
  RunnerAvatar,
  errorMessage,
  experienceLabel,
  locationLabel,
} from '@/components/ui';

function otherRunner(connection: Connection, runnerId: number): Runner | null {
  if (connection.fromRunnerId === runnerId) return connection.toRunner ?? null;
  return connection.fromRunner ?? null;
}

function RequestCard({
  connection,
  runnerId,
  onRespond,
  busy,
}: {
  connection: Connection;
  runnerId: number;
  onRespond: (connectionId: number, status: 'accepted' | 'declined') => void;
  busy: boolean;
}) {
  const colors = useColors();
  const router = useRouter();
  const incoming = connection.toRunnerId === runnerId;
  const runner = otherRunner(connection, runnerId);
  const title = runner?.profileType === 'individual' ? runner.name : runner?.clubName || runner?.name || 'RunBuddy runner';

  return (
    <View style={[styles.connectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => runner && router.push({ pathname: '/runner/[id]', params: { id: String(runner.id) } })}
        style={({ pressed }) => [styles.connectionTop, pressed && { opacity: 0.75 }]}
      >
        <RunnerAvatar uri={runner?.avatarUrl} gender={runner?.gender} size={52} />
        <View style={styles.runnerCopy}>
          <Text style={[styles.runnerName, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.runnerMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {runner ? locationLabel(runner.city, runner.country) || experienceLabel(runner.experience) : 'Runner profile'}
          </Text>
          {connection.message ? (
            <Text style={[styles.requestMessage, { color: colors.mutedForeground }]} numberOfLines={2}>
              “{connection.message}”
            </Text>
          ) : null}
        </View>
        <Feather name="arrow-up-right" size={17} color={colors.mutedForeground} />
      </Pressable>
      {incoming ? (
        <View style={styles.respondRow}>
          <ActionButton
            title="Decline"
            variant="outline"
            compact
            icon="x"
            onPress={() => onRespond(connection.id, 'declined')}
            loading={busy}
            testID={`decline-request-${connection.id}`}
          />
          <ActionButton
            title="Accept"
            compact
            icon="check"
            onPress={() => onRespond(connection.id, 'accepted')}
            loading={busy}
            testID={`accept-request-${connection.id}`}
          />
        </View>
      ) : (
        <View style={[styles.statusLine, { backgroundColor: colors.muted }]}>
          <Feather name="clock" size={14} color={colors.mutedForeground} />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Waiting for a reply</Text>
        </View>
      )}
    </View>
  );
}

function AcceptedCard({ connection, runnerId }: { connection: Connection; runnerId: number }) {
  const colors = useColors();
  const router = useRouter();
  const runner = otherRunner(connection, runnerId);
  const title = runner?.profileType === 'individual' ? runner.name : runner?.clubName || runner?.name || 'RunBuddy runner';
  return (
    <View style={[styles.connectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => runner && router.push({ pathname: '/runner/[id]', params: { id: String(runner.id) } })}
        style={({ pressed }) => [styles.connectionTop, pressed && { opacity: 0.75 }]}
      >
        <RunnerAvatar uri={runner?.avatarUrl} gender={runner?.gender} size={52} />
        <View style={styles.runnerCopy}>
          <Text style={[styles.runnerName, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.runnerMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {runner ? locationLabel(runner.city, runner.country) || 'Your running buddy' : 'Your running buddy'}
          </Text>
        </View>
        <Feather name="check-circle" size={19} color={colors.primary} />
      </Pressable>
      <ActionButton
        title="Message"
        variant="outline"
        compact
        icon="message-circle"
        onPress={() =>
          router.push({
            pathname: '/conversation/[otherId]',
            params: { otherId: String(connection.fromRunnerId === runnerId ? connection.toRunnerId : connection.fromRunnerId) },
          })
        }
        testID={`message-buddy-${connection.id}`}
      />
    </View>
  );
}

export default function ConnectionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const identity = useRunnerIdentity();
  const [actionError, setActionError] = useState<string | null>(null);
  const connectionsQuery = useListConnections(undefined, {
    query: {
      queryKey: getListConnectionsQueryKey(),
      enabled: Boolean(identity.signedIn && identity.runnerId),
    },
  });
  const updateConnection = useUpdateConnection();
  const all = connectionsQuery.data ?? [];
  const pending = all.filter((connection) => connection.status === 'pending');
  const accepted = all.filter((connection) => connection.status === 'accepted');
  const incoming = pending.filter((connection) => connection.toRunnerId === identity.runnerId);
  const outgoing = pending.filter((connection) => connection.fromRunnerId === identity.runnerId);

  const respond = async (id: number, status: 'accepted' | 'declined') => {
    setActionError(null);
    try {
      await updateConnection.mutateAsync({ id, data: { status } });
      await queryClient.invalidateQueries();
    } catch (error) {
      setActionError(errorMessage(error, 'That request could not be updated.'));
    }
  };

  return (
    <Page withTabBar>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={connectionsQuery.isRefetching} onRefresh={() => void connectionsQuery.refetch()} tintColor={colors.primary} />
          )
        }
      >
        <BrandHeader
          eyebrow="YOUR RUNNING CIRCLE"
          title="Connections"
          subtitle="Accept a request and make your next run together."
        />
        {!identity.signedIn ? (
          <EmptyState
            icon="user"
            title="Sign in to see requests"
            detail="Your connections stay tied to your RunBuddy account."
            action={<ActionButton title="Sign in" onPress={() => router.push('/(auth)/sign-in')} icon="arrow-right" />}
          />
        ) : identity.isPending ? (
          <LoadingState label="Checking your runner profile…" />
        ) : identity.isError ? (
          <ErrorState message="We could not confirm your runner profile." onRetry={() => void identity.refetch()} />
        ) : !identity.runnerId ? (
          <EmptyState
            icon="user-plus"
            title="Create your runner profile"
            detail="You’ll need a runner profile before you can receive or respond to connections."
            action={<ActionButton title="Set up my profile" onPress={() => router.push('/onboarding')} icon="arrow-right" />}
          />
        ) : connectionsQuery.isPending ? (
          <LoadingState label="Loading your connections…" />
        ) : connectionsQuery.isError ? (
          <ErrorState message="Your connections are unavailable right now." onRetry={() => void connectionsQuery.refetch()} />
        ) : (
          <>
            {actionError ? (
              <Text accessibilityRole="alert" style={[styles.actionError, { color: colors.destructive }]}>{actionError}</Text>
            ) : null}
            {incoming.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Needs your reply</Text>
                {incoming.map((connection) => (
                  <RequestCard
                    key={connection.id}
                    connection={connection}
                    runnerId={identity.runnerId!}
                    onRespond={respond}
                    busy={updateConnection.isPending}
                  />
                ))}
              </View>
            ) : null}
            {accepted.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your running buddies</Text>
                {accepted.map((connection) => (
                  <AcceptedCard key={connection.id} connection={connection} runnerId={identity.runnerId!} />
                ))}
              </View>
            ) : null}
            {outgoing.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sent requests</Text>
                {outgoing.map((connection) => (
                  <RequestCard
                    key={connection.id}
                    connection={connection}
                    runnerId={identity.runnerId!}
                    onRespond={respond}
                    busy={false}
                  />
                ))}
              </View>
            ) : null}
            {incoming.length + accepted.length + outgoing.length === 0 ? (
              <EmptyState
                icon="users"
                title="Your running circle starts here"
                detail="Find runners who share your pace and send them a buddy request."
                action={<ActionButton title="Explore runners" onPress={() => router.push('/(tabs)')} icon="search" />}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 26, gap: 14 },
  section: { gap: 11, marginTop: 8 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, marginBottom: 1 },
  connectionCard: { borderWidth: 1, borderRadius: 22, padding: 15, gap: 13 },
  connectionTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  runnerCopy: { flex: 1, gap: 4 },
  runnerName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
  runnerMeta: { fontFamily: 'Manrope_500Medium', fontSize: 12 },
  requestMessage: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 18, marginTop: 2 },
  respondRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderRadius: 13 },
  statusText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  actionError: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
});