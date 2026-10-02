import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useClerk } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import {
  getGetRunnerQueryKey,
  useGetRunner,
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
  Pill,
  RunnerAvatar,
  locationLabel,
} from '@/components/ui';

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const identity = useRunnerIdentity();
  const runnerId = identity.runnerId ?? 0;
  const runnerQuery = useGetRunner(identity.runnerId ?? 0, {
    query: {
      queryKey: getGetRunnerQueryKey(runnerId),
      enabled: Boolean(identity.signedIn && identity.runnerId),
    },
  });
  const runner = runnerQuery.data;
  const displayName =
    runner?.profileType === 'individual'
      ? runner.name
      : runner?.clubName || runner?.name || 'Your RunBuddy profile';

  const handleSignOut = async () => {
    await clerk.signOut();
    queryClient.clear();
    router.replace('/(tabs)/profile');
  };

  return (
    <Page withTabBar>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandHeader
          eyebrow="YOUR RUNBUDDY ACCOUNT"
          title={identity.signedIn ? 'Your profile' : 'Your next chapter'}
          subtitle={identity.signedIn ? 'Keep your running details up to date.' : 'Find your people, one run at a time.'}
        />
        {!identity.signedIn ? (
          <EmptyState
            icon="user"
            title="A running community, built around you"
            detail="Sign in or create an account to set up your runner profile and connect with local runners."
            action={
              <View style={styles.actions}>
                <ActionButton title="Sign in" onPress={() => router.push('/(auth)/sign-in')} icon="arrow-right" />
                <ActionButton title="Create account" onPress={() => router.push('/(auth)/sign-up')} variant="outline" />
              </View>
            }
          />
        ) : identity.isPending ? (
          <LoadingState label="Loading your runner profile…" />
        ) : identity.isError ? (
          <ErrorState message="We could not load your account profile." onRetry={() => void identity.refetch()} />
        ) : !identity.runnerId ? (
          <EmptyState
            icon="user-plus"
            title="Make this your running space"
            detail="Add your location, experience and running account. You choose whether your profile appears in discovery."
            action={<ActionButton title="Create my runner profile" onPress={() => router.push('/onboarding')} icon="arrow-right" />}
          />
        ) : runnerQuery.isPending ? (
          <LoadingState label="Loading your runner profile…" />
        ) : runnerQuery.isError || !runner ? (
          <ErrorState message="Your runner profile is unavailable right now." onRetry={() => void runnerQuery.refetch()} />
        ) : (
          <>
            <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.profileTop}>
                <RunnerAvatar uri={runner.avatarUrl} gender={runner.gender} size={76} />
                <View style={styles.profileCopy}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
                  <Text style={[styles.location, { color: colors.mutedForeground }]}>
                    {locationLabel(runner.city, runner.country) || 'Add your location'}
                  </Text>
                </View>
                <View style={[styles.statusIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="user" size={18} color={colors.accentForeground} />
                </View>
              </View>
              {runner.bio ? (
                <Text style={[styles.bio, { color: colors.mutedForeground }]}>{runner.bio}</Text>
              ) : (
                <Text style={[styles.bio, { color: colors.mutedForeground }]}>Add a short intro so other runners know what you enjoy.</Text>
              )}
              <View style={styles.tags}>
                <Pill label={runner.experience ? runner.experience.charAt(0).toUpperCase() + runner.experience.slice(1) : 'Experience not set'} />
                <Pill label={runner.publicListing ? 'Discoverable' : 'Private profile'} />
                {runner.trackingApps?.appleHealthConnected ? <Pill label="Apple Health / Watch" /> : null}
              </View>
              <View style={[styles.privacyRow, { backgroundColor: colors.muted }]}>
                <Feather name={runner.publicListing ? 'eye' : 'eye-off'} size={15} color={colors.mutedForeground} />
                <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
                  {runner.publicListing
                    ? 'Your profile is opted in to public runner discovery.'
                    : 'Your profile is private and hidden from public discovery.'}
                </Text>
              </View>
            </View>
            <ActionButton title="Edit runner profile" onPress={() => router.push('/profile/edit')} icon="edit-3" />
            <ActionButton title="Sign out" onPress={handleSignOut} variant="outline" icon="log-out" />
          </>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 26, gap: 14 },
  actions: { width: '100%', gap: 9 },
  profileCard: { borderWidth: 1, borderRadius: 25, padding: 19, gap: 17 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  profileCopy: { flex: 1, gap: 4 },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20 },
  location: { fontFamily: 'Manrope_500Medium', fontSize: 13 },
  statusIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bio: { fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 21 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 14 },
  privacyText: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 17 },
});