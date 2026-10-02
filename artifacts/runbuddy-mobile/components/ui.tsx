import React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type IconName = React.ComponentProps<typeof Feather>['name'];

export function Page({
  children,
  withTabBar = false,
  style,
}: {
  children: React.ReactNode;
  withTabBar?: boolean;
  style?: object;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.page,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'web' ? 67 : insets.top,
          paddingBottom:
            Platform.OS === 'web' ? 34 : withTabBar ? 0 : insets.bottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function BrandHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <Image
      source={require('../assets/images/icon.png')}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      accessibilityLabel="RunBuddy"
    />
  );
}

export function ActionButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  compact = false,
  testID,
}: {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'outline' | 'quiet' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  const background =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.secondary
        : variant === 'danger'
          ? colors.destructive
          : variant === 'outline'
            ? colors.card
            : 'transparent';
  const foreground =
    variant === 'primary'
      ? colors.primaryForeground
      : variant === 'secondary'
        ? colors.secondaryForeground
        : variant === 'danger'
          ? colors.destructiveForeground
          : colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        if (Platform.OS !== 'web') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        void onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: background,
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          opacity: disabled || loading ? 0.56 : pressed ? 0.78 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : icon ? (
        <Feather name={icon} size={compact ? 15 : 17} color={foreground} />
      ) : null}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: foreground }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function TextField({
  label,
  icon,
  error,
  style,
  ...props
}: TextInputProps & {
  label?: string;
  icon?: IconName;
  error?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldWrap}>
      {label ? (
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputShell,
          { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.input },
        ]}
      >
        {icon ? (
          <Feather name={icon} size={17} color={colors.mutedForeground} />
        ) : null}
        <TextInput
          {...props}
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.primary}
          style={[
            styles.input,
            style,
            { color: colors.foreground },
            props.multiline && styles.inputMultiline,
          ]}
        />
      </View>
      {error ? (
        <Text style={[styles.fieldError, { color: colors.destructive }]}>{error}</Text>
      ) : null}
    </View>
  );
}

export function RunnerAvatar({
  uri,
  gender,
  size = 52,
}: {
  uri?: string | null;
  gender?: string | null;
  size?: number;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const resolvedUri = React.useMemo(() => {
    if (!uri || /^(https?:|data:|blob:)/i.test(uri)) return uri;
    const path = uri.startsWith('/') ? uri : `/${uri}`;
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (domain) return `https://${domain}${path}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return new URL(path, window.location.origin).toString();
    }
    return uri;
  }, [uri]);
  React.useEffect(() => setImageFailed(false), [uri]);
  const fallback =
    gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'man'
      ? require('../assets/images/avatar-m.png')
      : require('../assets/images/avatar-f.png');

  return (
    <Image
      source={resolvedUri && !imageFailed ? { uri: resolvedUri } : fallback}
      onError={() => setImageFailed(true)}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#DDE6D6',
      }}
      accessibilityLabel="Runner profile photo"
    />
  );
}

export function Pill({
  label,
  selected = false,
  onPress,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const colors = useColors();
  const content = (
    <Text
      style={[
        styles.pillText,
        { color: selected ? colors.primaryForeground : colors.mutedForeground },
      ]}
    >
      {label}
    </Text>
  );
  const style = [
    styles.pill,
    {
      backgroundColor: selected ? colors.primary : colors.muted,
      borderColor: selected ? colors.primary : colors.border,
    },
  ];
  return onPress ? (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { opacity: 0.75 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

export function LoadingState({ label = 'Loading your RunBuddy data…' }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.feedback}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.feedbackText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message = 'We could not load this right now.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.feedbackCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.feedbackIcon, { backgroundColor: colors.accent }]}>
        <Feather name="wifi-off" size={20} color={colors.foreground} />
      </View>
      <Text style={[styles.feedbackTitle, { color: colors.foreground }]}>A quick pause</Text>
      <Text style={[styles.feedbackText, { color: colors.mutedForeground }]}>{message}</Text>
      {onRetry ? <ActionButton title="Try again" onPress={onRetry} variant="outline" icon="refresh-cw" /> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'users',
  title,
  detail,
  action,
}: {
  icon?: IconName;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.feedbackCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.feedbackIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={20} color={colors.foreground} />
      </View>
      <Text style={[styles.feedbackTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.feedbackText, { color: colors.mutedForeground }]}>{detail}</Text>
      {action}
    </View>
  );
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function locationLabel(city?: string | null, country?: string | null) {
  return [city, country].filter((part): part is string => Boolean(part?.trim())).join(', ');
}

export function experienceLabel(experience?: string | null) {
  if (!experience) return 'Runner';
  return experience.charAt(0).toUpperCase() + experience.slice(1);
}

export function messageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 29,
    lineHeight: 35,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.7,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Manrope_400Regular',
    marginTop: 6,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: 14, borderRadius: 13 },
  buttonText: { fontFamily: 'Manrope_700Bold', fontSize: 15, letterSpacing: 0.1 },
  buttonTextCompact: { fontSize: 13 },
  fieldWrap: { gap: 8 },
  fieldLabel: { fontFamily: 'Manrope_700Bold', fontSize: 13, marginLeft: 2 },
  inputShell: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 12,
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    outlineStyle: 'none',
  } as never,
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  fieldError: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', marginLeft: 2 },
  pill: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  feedback: { paddingVertical: 42, alignItems: 'center', gap: 14 },
  feedbackCard: {
    borderWidth: 1,
    borderRadius: 23,
    alignItems: 'center',
    padding: 24,
    gap: 12,
    marginTop: 10,
  },
  feedbackIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  feedbackTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 19, textAlign: 'center' },
  feedbackText: { fontFamily: 'Manrope_500Medium', fontSize: 14, lineHeight: 21, textAlign: 'center' },
});