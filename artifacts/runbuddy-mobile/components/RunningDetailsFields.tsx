import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Runner } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { Pill, TextField } from '@/components/ui';

export type RunningDetailsInput = {
  weeklyMileageKm: string;
  totalRaces: string;
  avgPacePerKm: string;
  personalBest5k: string;
  personalBest10k: string;
  personalBestHalfMarathon: string;
  personalBestMarathon: string;
  preferredRunTypes: string[];
};

export const RUN_TYPE_OPTIONS = ['road', 'trail', 'track', 'treadmill', 'ultra'] as const;

export function emptyRunningDetails(): RunningDetailsInput {
  return {
    weeklyMileageKm: '',
    totalRaces: '',
    avgPacePerKm: '',
    personalBest5k: '',
    personalBest10k: '',
    personalBestHalfMarathon: '',
    personalBestMarathon: '',
    preferredRunTypes: [],
  };
}

export function runningDetailsFromStats(
  stats: Runner['runningStats'] | null | undefined,
): RunningDetailsInput {
  return {
    weeklyMileageKm: stats?.weeklyMileageKm?.toString() ?? '',
    totalRaces: stats?.totalRaces?.toString() ?? '',
    avgPacePerKm: stats?.avgPacePerKm ?? '',
    personalBest5k: stats?.personalBest5k ?? '',
    personalBest10k: stats?.personalBest10k ?? '',
    personalBestHalfMarathon: stats?.personalBestHalfMarathon ?? '',
    personalBestMarathon: stats?.personalBestMarathon ?? '',
    preferredRunTypes: stats?.preferredRunTypes?.filter(Boolean) ?? [],
  };
}

export function validateRunningDetails(value: RunningDetailsInput): string | null {
  const weeklyMileage = value.weeklyMileageKm.trim();
  if (
    weeklyMileage &&
    (!Number.isFinite(Number(weeklyMileage)) ||
      Number(weeklyMileage) < 0 ||
      Number(weeklyMileage) > 500)
  ) {
    return 'Weekly mileage must be between 0 and 500 km.';
  }

  const totalRaces = value.totalRaces.trim();
  if (
    totalRaces &&
    (!/^\d+$/.test(totalRaces) || Number(totalRaces) > 5000)
  ) {
    return 'Total races must be a whole number from 0 to 5,000.';
  }

  const times = [
    value.avgPacePerKm,
    value.personalBest5k,
    value.personalBest10k,
    value.personalBestHalfMarathon,
    value.personalBestMarathon,
  ];
  if (
    times.some((time) => time.trim() && !/^(?:\d{1,2}:)?\d{1,2}:[0-5]\d$/.test(time.trim()))
  ) {
    return 'Enter pace and personal bests as mm:ss or h:mm:ss.';
  }

  return null;
}

export function runningStatsFromInput(
  value: RunningDetailsInput,
): NonNullable<Runner['runningStats']> {
  const textOrNull = (text: string) => text.trim() || null;
  return {
    weeklyMileageKm: value.weeklyMileageKm.trim()
      ? Number(value.weeklyMileageKm)
      : null,
    totalRaces: value.totalRaces.trim() ? Number(value.totalRaces) : null,
    avgPacePerKm: textOrNull(value.avgPacePerKm),
    personalBest5k: textOrNull(value.personalBest5k),
    personalBest10k: textOrNull(value.personalBest10k),
    personalBestHalfMarathon: textOrNull(value.personalBestHalfMarathon),
    personalBestMarathon: textOrNull(value.personalBestMarathon),
    preferredRunTypes: value.preferredRunTypes.length
      ? value.preferredRunTypes
      : null,
  };
}

export function RunningDetailsFields({
  value,
  onChange,
  testIDPrefix,
}: {
  value: RunningDetailsInput;
  onChange: (value: RunningDetailsInput) => void;
  testIDPrefix: string;
}) {
  const colors = useColors();
  const update = <K extends keyof RunningDetailsInput>(
    key: K,
    nextValue: RunningDetailsInput[K],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <View style={styles.group}>
      <Text style={[styles.title, { color: colors.foreground }]}>Running details</Text>
      <Text style={[styles.helper, { color: colors.mutedForeground }]}>
        Optional. Visible to signed-in runners on your profile, not to signed-out visitors.
      </Text>
      <View style={styles.twoColumn}>
        <TextField
          label="Weekly mileage (km)"
          value={value.weeklyMileageKm}
          onChangeText={(text) => update('weeklyMileageKm', text)}
          placeholder="e.g. 30"
          keyboardType="decimal-pad"
          maxLength={6}
          testID={`${testIDPrefix}-weekly-mileage`}
        />
        <TextField
          label="Total races"
          value={value.totalRaces}
          onChangeText={(text) => update('totalRaces', text)}
          placeholder="e.g. 12"
          keyboardType="number-pad"
          maxLength={4}
          testID={`${testIDPrefix}-total-races`}
        />
        <TextField
          label="Average pace (min/km)"
          value={value.avgPacePerKm}
          onChangeText={(text) => update('avgPacePerKm', text)}
          placeholder="e.g. 5:30"
          keyboardType="numbers-and-punctuation"
          maxLength={8}
          testID={`${testIDPrefix}-average-pace`}
        />
        <TextField
          label="5K best"
          value={value.personalBest5k}
          onChangeText={(text) => update('personalBest5k', text)}
          placeholder="e.g. 25:30"
          keyboardType="numbers-and-punctuation"
          maxLength={8}
          testID={`${testIDPrefix}-personal-best-5k`}
        />
        <TextField
          label="10K best"
          value={value.personalBest10k}
          onChangeText={(text) => update('personalBest10k', text)}
          placeholder="e.g. 52:00"
          keyboardType="numbers-and-punctuation"
          maxLength={8}
          testID={`${testIDPrefix}-personal-best-10k`}
        />
        <TextField
          label="Half marathon best"
          value={value.personalBestHalfMarathon}
          onChangeText={(text) => update('personalBestHalfMarathon', text)}
          placeholder="e.g. 1:55:00"
          keyboardType="numbers-and-punctuation"
          maxLength={8}
          testID={`${testIDPrefix}-personal-best-half`}
        />
        <TextField
          label="Marathon best"
          value={value.personalBestMarathon}
          onChangeText={(text) => update('personalBestMarathon', text)}
          placeholder="e.g. 4:10:00"
          keyboardType="numbers-and-punctuation"
          maxLength={8}
          testID={`${testIDPrefix}-personal-best-marathon`}
        />
      </View>
      <View style={styles.runTypes}>
        <Text style={[styles.label, { color: colors.foreground }]}>Preferred run types</Text>
        <View style={styles.pills}>
          {RUN_TYPE_OPTIONS.map((runType) => {
            const selected = value.preferredRunTypes.includes(runType);
            return (
              <Pill
                key={runType}
                label={runType.charAt(0).toUpperCase() + runType.slice(1)}
                selected={selected}
                onPress={() =>
                  update(
                    'preferredRunTypes',
                    selected
                      ? value.preferredRunTypes.filter((item) => item !== runType)
                      : [...value.preferredRunTypes, runType],
                  )
                }
                testID={`${testIDPrefix}-run-type-${runType}`}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12, paddingTop: 5 },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 15 },
  helper: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 17 },
  twoColumn: { gap: 12 },
  runTypes: { gap: 9 },
  label: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});