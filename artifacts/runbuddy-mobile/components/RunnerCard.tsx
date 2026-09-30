import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Runner } from '@workspace/api-client-react';
import { experienceLabel, locationLabel, RunnerAvatar } from '@/components/ui';

export function RunnerCard({ runner }: { runner: Runner }) {
  const colors = useColors();
  const router = useRouter();
  const title =
    runner.profileType === 'individual'
      ? runner.name
      : runner.clubName || runner.name;
  const location = locationLabel(runner.city, runner.country);
  const weeklyMileage = runner.runningStats?.weeklyMileageKm;

  return (
    <Pressable
      testID={`runner-card-${runner.id}`}
      accessibilityRole="button"
      accessibilityLabel={`View ${title}'s runner profile`}
      onPress={() =>
        router.push({
          pathname: '/runner/[id]',
          params: { id: String(runner.id) },
        })
      }
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.83 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <RunnerAvatar uri={runner.avatarUrl} gender={runner.gender} size={58} />
        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={[styles.name, { color: colors.foreground }]}>
            {title}
          </Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={13} color={colors.mutedForeground} />
            <Text numberOfLines={1} style={[styles.location, { color: colors.mutedForeground }]}>
              {location || 'Location not shared'}
            </Text>
          </View>
        </View>
        <Feather name="arrow-up-right" size={18} color={colors.mutedForeground} />
      </View>
      {runner.bio ? (
        <Text numberOfLines={2} style={[styles.bio, { color: colors.mutedForeground }]}>
          {runner.bio}
        </Text>
      ) : null}
      <View style={styles.pills}>
        <View style={[styles.pill, { backgroundColor: colors.accent }]}>
          <Text style={[styles.pillText, { color: colors.accentForeground }]}>
            {experienceLabel(runner.experience)}
          </Text>
        </View>
        {typeof weeklyMileage === 'number' ? (
          <View style={[styles.pill, { backgroundColor: colors.muted }]}>
            <Text style={[styles.pillText, { color: colors.foreground }]}>
              {Math.round(weeklyMileage)} km / week
            </Text>
          </View>
        ) : null}
        {runner.profileType !== 'individual' ? (
          <View style={[styles.pill, { backgroundColor: colors.muted }]}>
            <Text style={[styles.pillText, { color: colors.foreground }]}>Club</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 17, borderRadius: 22, borderWidth: 1, gap: 13 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  titleWrap: { flex: 1, gap: 5 },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  location: { fontFamily: 'Manrope_500Medium', fontSize: 12, flexShrink: 1 },
  bio: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pillText: { fontFamily: 'Manrope_700Bold', fontSize: 11 },
});