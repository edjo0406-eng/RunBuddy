import React from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  getGetInboxQueryKey,
  getGetUnreadCountQueryKey,
  useGetInbox,
  useGetUnreadCount,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useInboxMessageUpdates } from '@/hooks/useInboxMessageUpdates';
import { useRunnerIdentity } from '@/hooks/useRunnerIdentity';
import {
  ActionButton,
  BrandHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  Page,
  RunnerAvatar,
  messageTime,
} from '@/components/ui';

const INBOX_RECOVERY_REFETCH_INTERVAL_MS = 15_000;

export default function InboxScreen() {
  const colors = useColors();
  const router = useRouter();
  const identity = useRunnerIdentity();
  const enabled = Boolean(identity.signedIn && identity.userId && identity.runnerId);
  const inboxQueryKey = [...getGetInboxQueryKey(), identity.userId ?? null];
  const unreadQueryKey = [...getGetUnreadCountQueryKey(), identity.userId ?? null];
  const inboxQuery = useGetInbox({
    query: {
      queryKey: inboxQueryKey,
      enabled,
      refetchInterval: enabled ? INBOX_RECOVERY_REFETCH_INTERVAL_MS : false,
    },
  });
  const unreadQuery = useGetUnreadCount({
    query: {
      queryKey: unreadQueryKey,
      enabled,
      refetchInterval: enabled ? INBOX_RECOVERY_REFETCH_INTERVAL_MS : false,
    },
  });
  useInboxMessageUpdates({
    enabled,
    runnerId: identity.runnerId,
    userId: identity.userId,
  });
  const conversations = inboxQuery.data ?? [];

  return (
    <Page withTabBar>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={inboxQuery.isRefetching || unreadQuery.isRefetching}
              onRefresh={() => {
                void Promise.all([inboxQuery.refetch(), unreadQuery.refetch()]);
              }}
              tintColor={colors.primary}
            />
          )
        }
      >
        <BrandHeader
          eyebrow="ONE RUN AT A TIME"
          title="Messages"
          subtitle={
            (unreadQuery.data?.count ?? 0) > 0
              ? `${unreadQuery.data!.count} unread ${unreadQuery.data!.count === 1 ? 'message' : 'messages'}`
              : 'Make a plan for your next shared mile.'
          }
        />
        {!identity.signedIn ? (
          <EmptyState
            icon="message-circle"
            title="Your conversations live here"
            detail="Sign in to message the runners you connect with."
            action={<ActionButton title="Sign in" onPress={() => router.push('/(auth)/sign-in')} icon="arrow-right" />}
          />
        ) : identity.isPending ? (
          <LoadingState label="Checking your runner profile…" />
        ) : identity.isError ? (
          <ErrorState message="We could not confirm your runner profile." onRetry={() => void identity.refetch()} />
        ) : !identity.runnerId ? (
          <EmptyState
            icon="user-plus"
            title="Set up your runner profile"
            detail="Create your profile to connect with runners and start conversations."
            action={<ActionButton title="Set up my profile" onPress={() => router.push('/onboarding')} icon="arrow-right" />}
          />
        ) : inboxQuery.isPending ? (
          <LoadingState label="Loading your messages…" />
        ) : inboxQuery.isError ? (
          <ErrorState message="Your inbox is unavailable right now." onRetry={() => void inboxQuery.refetch()} />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon="send"
            title="No conversations yet"
            detail="When a running buddy accepts your request, you can message them here."
            action={<ActionButton title="Discover runners" onPress={() => router.push('/(tabs)')} icon="search" />}
          />
        ) : (
          <View style={styles.list}>
            {conversations.map((conversation) => {
              const runner = conversation.otherRunner;
              const title =
                runner?.profileType === 'individual'
                  ? runner.name
                  : runner?.clubName || runner?.name || 'RunBuddy runner';
              return (
                <Pressable
                  key={conversation.otherId}
                  testID={`conversation-${conversation.otherId}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open conversation with ${title}`}
                  onPress={() =>
                    router.push({
                      pathname: '/conversation/[otherId]',
                      params: { otherId: String(conversation.otherId) },
                    })
                  }
                  style={({ pressed }) => [
                    styles.conversation,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <RunnerAvatar uri={runner?.avatarUrl} gender={runner?.gender} size={54} />
                  <View style={styles.conversationCopy}>
                    <View style={styles.conversationTitleRow}>
                      <Text numberOfLines={1} style={[styles.name, { color: colors.foreground }]}>{title}</Text>
                      <Text style={[styles.time, { color: colors.mutedForeground }]}>{messageTime(conversation.latestMessage.createdAt)}</Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.latest, { color: colors.mutedForeground }]}>
                      {conversation.latestMessage.content}
                    </Text>
                  </View>
                  {conversation.unreadCount > 0 ? (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.unreadCount, { color: colors.primaryForeground }]}>
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </Text>
                    </View>
                  ) : (
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 26, gap: 14 },
  list: { gap: 10 },
  conversation: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 21, padding: 14 },
  conversationCopy: { flex: 1, gap: 5 },
  conversationTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
  time: { fontFamily: 'Manrope_500Medium', fontSize: 11 },
  latest: { fontFamily: 'Manrope_400Regular', fontSize: 13 },
  unreadDot: { minWidth: 23, height: 23, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  unreadCount: { fontFamily: 'Manrope_700Bold', fontSize: 11 },
});