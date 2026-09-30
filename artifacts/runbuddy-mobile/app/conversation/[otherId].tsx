import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetConversationQueryKey,
  getGetRunnerQueryKey,
  useGetConversation,
  useGetRunner,
  useSendMessage,
  type Message,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useRunnerIdentity } from '@/hooks/useRunnerIdentity';
import {
  ActionButton,
  EmptyState,
  ErrorState,
  Page,
  RunnerAvatar,
  errorMessage,
} from '@/components/ui';

function ChatBubble({ message, mine }: { message: Message; mine: boolean }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.bubble,
        {
          alignSelf: mine ? 'flex-end' : 'flex-start',
          backgroundColor: mine ? colors.primary : colors.card,
          borderColor: mine ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.bubbleText, { color: mine ? colors.primaryForeground : colors.foreground }]}>
        {message.content}
      </Text>
    </View>
  );
}

export default function ConversationScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ otherId: string }>();
  const otherId = Number(params.otherId);
  const validId = Number.isInteger(otherId) && otherId > 0;
  const identity = useRunnerIdentity();
  const enabled = Boolean(identity.signedIn && identity.runnerId && validId);
  const runnerId = validId ? otherId : 0;
  const runnerQuery = useGetRunner(runnerId, {
    query: { queryKey: getGetRunnerQueryKey(runnerId), enabled },
  });
  const conversationParams = { otherId: validId ? otherId : 0 };
  const conversationQuery = useGetConversation(
    conversationParams,
    {
      query: {
        queryKey: getGetConversationQueryKey(conversationParams),
        enabled,
      },
    },
  );
  const sendMessage = useSendMessage();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const runner = runnerQuery.data;
  const name =
    runner?.profileType === 'individual'
      ? runner.name
      : runner?.clubName || runner?.name || 'RunBuddy runner';
  const messages = useMemo(
    () =>
      [...(conversationQuery.data ?? [])].sort(
        (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
      ),
    [conversationQuery.data],
  );

  const submit = async () => {
    const content = draft.trim();
    if (!content || !validId) return;
    setSendError(null);
    try {
      await sendMessage.mutateAsync({ data: { toRunnerId: otherId, content } });
      setDraft('');
      await queryClient.invalidateQueries();
    } catch (error) {
      setSendError(errorMessage(error, 'Your message could not be sent.'));
    }
  };

  if (!validId) {
    return (
      <Page>
        <View style={styles.gate}>
          <EmptyState icon="message-circle" title="Conversation not found" detail="This conversation link is not valid." action={<ActionButton title="Open inbox" onPress={() => router.replace('/(tabs)/inbox')} icon="arrow-left" />} />
        </View>
      </Page>
    );
  }

  if (!identity.signedIn || !identity.runnerId) {
    return (
      <Page>
        <View style={styles.gate}>
          <EmptyState
            icon="lock"
            title="Sign in to open this conversation"
            detail="Messages are only available to connected RunBuddy runners."
            action={<ActionButton title="Sign in" onPress={() => router.push('/(auth)/sign-in')} icon="arrow-right" />}
          />
        </View>
      </Page>
    );
  }

  return (
    <Page style={styles.page}>
      <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to inbox" onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        {runnerQuery.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : runnerQuery.isError ? (
          <Text style={[styles.headerName, { color: colors.foreground }]}>RunBuddy conversation</Text>
        ) : (
          <>
            <RunnerAvatar uri={runner?.avatarUrl} gender={runner?.gender} size={38} />
            <View style={styles.headerCopy}>
              <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
              <Text style={[styles.headerHint, { color: colors.mutedForeground }]}>Running buddy</Text>
            </View>
          </>
        )}
      </View>
      {conversationQuery.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : conversationQuery.isError ? (
        <View style={styles.gate}>
          <ErrorState message="This conversation could not be loaded." onRetry={() => void conversationQuery.refetch()} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior="padding" style={styles.keyboardArea}>
          <FlatList
            inverted
            data={messages}
            keyExtractor={(message) => String(message.id)}
            renderItem={({ item }) => (
              <ChatBubble message={item} mine={item.fromRunnerId === identity.runnerId} />
            )}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={[styles.emptyChat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="sun" size={20} color={colors.primary} />
                <Text style={[styles.emptyChatTitle, { color: colors.foreground }]}>Say hello</Text>
                <Text style={[styles.emptyChatCopy, { color: colors.mutedForeground }]}>
                  Start with a route, a pace, or a day that works for a run.
                </Text>
              </View>
            }
          />
          <View style={[styles.composerWrap, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {sendError ? <Text accessibilityRole="alert" style={[styles.sendError, { color: colors.destructive }]}>{sendError}</Text> : null}
            <View style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.input }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message…"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.messageInput, { color: colors.foreground }]}
                multiline
                maxLength={4000}
                accessibilityLabel="Write a message"
                testID="message-draft"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send message"
                testID="send-message"
                disabled={!draft.trim() || sendMessage.isPending}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.send,
                  { backgroundColor: colors.primary, opacity: !draft.trim() || sendMessage.isPending ? 0.45 : pressed ? 0.75 : 1 },
                ]}
              >
                {sendMessage.isPending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Feather name="arrow-up" size={18} color={colors.primaryForeground} />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 0 },
  gate: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  chatHeader: { minHeight: 64, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16 },
  back: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  headerName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
  headerHint: { fontFamily: 'Manrope_500Medium', fontSize: 11 },
  keyboardArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: 16, paddingVertical: 17, gap: 9 },
  bubble: { maxWidth: '82%', borderRadius: 18, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 14 },
  bubbleText: { fontFamily: 'Manrope_500Medium', fontSize: 14, lineHeight: 20 },
  emptyChat: { alignSelf: 'center', borderWidth: 1, borderRadius: 19, padding: 17, alignItems: 'center', gap: 7, marginTop: 30, maxWidth: 290 },
  emptyChatTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17 },
  emptyChatCopy: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  composerWrap: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 10 },
  composer: { minHeight: 50, maxHeight: 132, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 14, paddingRight: 6, paddingVertical: 5 },
  messageInput: { flex: 1, maxHeight: 112, minHeight: 39, paddingTop: 10, paddingBottom: 9, fontFamily: 'Manrope_500Medium', fontSize: 14, textAlignVertical: 'center' },
  send: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginBottom: 1 },
  sendError: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, marginHorizontal: 4, marginBottom: 7 },
});