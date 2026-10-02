import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useSignUp } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import {
  ActionButton,
  BrandMark,
  Page,
  TextField,
  errorMessage,
} from '@/components/ui';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

export default function SignUpScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signUp, fetchStatus } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const busy = fetchStatus === 'fetching';

  const finishSignUp = async () => {
    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setFeedback('Complete the security task in your Clerk account, then sign in again.');
          return;
        }
        router.replace(decorateUrl('/(tabs)/profile') as Href);
      },
    });
  };

  const createAccount = async () => {
    setFeedback(null);
    try {
      const result = await signUp.password({
        emailAddress: email.trim(),
        password,
      });
      if (result.error) {
        setFeedback(errorMessage(result.error, 'Check your details and try again.'));
        return;
      }
      await signUp.verifications.sendEmailCode();
      setCodeSent(true);
      setFeedback('We sent a verification code to your email.');
    } catch (error) {
      setFeedback(errorMessage(error, 'Your account could not be created.'));
    }
  };

  const verifyEmail = async () => {
    setFeedback(null);
    try {
      await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (signUp.status === 'complete') await finishSignUp();
      else setFeedback('That code was not accepted. Check it and try again.');
    } catch (error) {
      setFeedback(errorMessage(error, 'That code was not accepted. Check it and try again.'));
    }
  };

  return (
    <Page>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <BrandMark size={54} />
          <Text style={[styles.brandName, { color: colors.foreground }]}>RunBuddy</Text>
        </View>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {codeSent ? 'Verify your email' : 'Let’s get moving'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {codeSent
              ? `Enter the one-time code we sent to ${email.trim()}.`
              : 'Create an account to meet runners and plan a better run.'}
          </Text>
        </View>
        {codeSent ? (
          <>
            <TextField
              label="Email verification code"
              value={code}
              onChangeText={setCode}
              placeholder="Enter the code"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              testID="sign-up-code"
            />
            <ActionButton
              title="Verify email"
              onPress={verifyEmail}
              loading={busy}
              disabled={!code.trim()}
              icon="check"
              testID="verify-sign-up-code"
            />
            <ActionButton
              title="Send a new code"
              variant="outline"
              onPress={async () => {
                try {
                  await signUp.verifications.sendEmailCode();
                  setFeedback('A new code is on its way.');
                } catch (error) {
                  setFeedback(errorMessage(error));
                }
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCodeSent(false);
                setCode('');
                setFeedback(null);
                signUp.reset();
              }}
            >
              <Text style={[styles.link, { color: colors.foreground }]}>Use a different email</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              testID="sign-up-email"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              testID="sign-up-password"
            />
            <ActionButton
              title="Create account"
              onPress={createAccount}
              loading={busy}
              disabled={!email.trim() || !password}
              icon="arrow-right"
              testID="sign-up-submit"
            />
          </>
        )}
        {feedback ? (
          <View style={[styles.feedback, { backgroundColor: colors.muted }]}>
            <Feather name="info" size={16} color={colors.mutedForeground} />
            <Text accessibilityRole="alert" style={[styles.feedbackText, { color: colors.foreground }]}>{feedback}</Text>
          </View>
        ) : null}
        <View nativeID="clerk-captcha" />
        {!codeSent ? (
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account?</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/sign-in')}>
              <Text style={[styles.link, { color: colors.foreground }]}>Sign in</Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 26, paddingBottom: 32, gap: 16, justifyContent: 'center' },
  brand: { alignItems: 'center', gap: 7, marginBottom: 10 },
  brandName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22 },
  heading: { gap: 5, marginBottom: 2 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20 },
  feedback: { padding: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  feedbackText: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 },
  footerText: { fontFamily: 'Manrope_500Medium', fontSize: 13 },
  link: { fontFamily: 'Manrope_700Bold', fontSize: 13, textDecorationLine: 'underline', paddingVertical: 9 },
});