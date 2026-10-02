import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getListRunnersQueryKey,
  useListRunners,
} from '@workspace/api-client-react';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import {
  ActionButton,
  BrandHeader,
  EmptyState,
  ErrorState,
  Page,
  TextField,
} from '@/components/ui';
import { RunnerCard } from '@/components/RunnerCard';
import { useRunnerIdentity } from '@/hooks/useRunnerIdentity';

export default function DiscoverScreen() {
  const colors = useColors();
  const router = useRouter();
  const identity = useRunnerIdentity();
  const [cityInput, setCityInput] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setCity(cityInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [cityInput]);

  const runnerParams = { mode: 'buddy' as const, city: city || undefined };
  const runnersQuery = useListRunners(runnerParams, {
    query: {
      queryKey: getListRunnersQueryKey(runnerParams),
      staleTime: 45_000,
    },
  });
  const runners = runnersQuery.data ?? [];

  return (
    <Page withTabBar>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={runnersQuery.isRefetching}
              onRefresh={() => void runnersQuery.refetch()}
              tintColor={colors.primary}
            />
          )
        }
      >
        <BrandHeader
          eyebrow="RUN WITH YOUR PEOPLE"
          title="Find your next run."
          subtitle="Meet local runners who make every mile better."
        />

        {identity.authLoaded && !identity.signedIn ? (
          <View style={styles.authActions}>
            <ActionButton
              title="Sign in"
              onPress={() => router.push('/(auth)/sign-in')}
              icon="arrow-right"
              testID="discover-sign-in"
            />
            <ActionButton
              title="Create account"
              onPress={() => router.push('/(auth)/sign-up')}
              variant="outline"
              testID="discover-create-account"
            />
          </View>
        ) : null}

        <ImageBackground
          source={require('../../assets/images/hero-bg.png')}
          imageStyle={styles.heroImage}
          style={styles.hero}
        >
          <View style={styles.heroShade}>
            <View style={[styles.heroStamp, { backgroundColor: colors.primary }]}>
              <Text style={[styles.heroStampText, { color: colors.primaryForeground }]}>
                YOUR NEXT PACE MATE
              </Text>
            </View>
            <Text style={styles.heroTitle}>Good miles are better together.</Text>
            <Text style={styles.heroDescription}>
              Discover runners nearby and find a rhythm that fits.
            </Text>
          </View>
        </ImageBackground>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Runners near you
            </Text>
            <Text style={[styles.sectionCopy, { color: colors.mutedForeground }]}>
              Public profiles, shared by runners themselves.
            </Text>
          </View>
        </View>

        <TextField
          icon="search"
          accessibilityLabel="Search runners by city"
          placeholder="Search by city"
          value={cityInput}
          onChangeText={setCityInput}
          returnKeyType="search"
          testID="discover-city-search"
        />

        {runnersQuery.isPending ? (
          <View style={styles.loading}>
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Finding runners…
            </Text>
          </View>
        ) : runnersQuery.isError ? (
          <ErrorState
            message="Runner discovery is unavailable right now."
            onRetry={() => void runnersQuery.refetch()}
          />
        ) : runners.length === 0 ? (
          <EmptyState
            icon="map"
            title={city ? `No public runners in ${city} yet` : 'No public runners just yet'}
            detail="Try another city, or check back as more runners choose to be discoverable."
          />
        ) : (
          <View style={styles.runnerList}>
            {runners.map((runner) => (
              <RunnerCard key={runner.id} runner={runner} />
            ))}
          </View>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28, gap: 18 },
  authActions: { gap: 9 },
  hero: { height: 188, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end' },
  heroImage: { borderRadius: 24 },
  heroShade: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: 'rgba(15, 23, 36, 0.48)',
  },
  heroStamp: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginBottom: 9 },
  heroStampText: { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 1 },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 21,
    lineHeight: 25,
    maxWidth: 280,
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 5,
  },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20 },
  sectionCopy: { fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 3 },
  runnerList: { gap: 11 },
  loading: { alignItems: 'center', paddingVertical: 34 },
  loadingText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
});
