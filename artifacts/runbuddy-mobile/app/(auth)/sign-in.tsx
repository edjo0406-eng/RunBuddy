import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useSignIn, useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
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

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const busy = fetchStatus === 'fetching' || oauthBusy;

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const finishSignIn = async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setFeedback('Complete the security task in your Clerk account, then sign in again.');
          return;
        }
        router.replace(decorateUrl('/(tabs)/profile') as Href);
      },
    });
  };

  const submitPassword = async () => {
    setFeedback(null);
    try {
      const result = await signIn.password({
        emailAddress: email.trim(),
        password,
      });
      if (result.error) {
        setFeedback(errorMessage(result.error, 'Check your email and password.'));
        return;
      }
      if (signIn.status === 'complete') {
        await finishSignIn();
        return;
      }
      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        const emailFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === 'email_code',
        );
        if (emailFactor || signIn.status === 'needs_client_trust') {
          await signIn.mfa.sendEmailCode();
          setNeedsCode(true);
          setFeedback('We sent a verification code to your email.');
        } else {
          setFeedback('This account requires a verification method not available in this sign-in flow.');
        }
        return;
      }
      setFeedback('This sign-in needs another step. Please try again or use Google.');
    } catch (error) {
      setFeedback(errorMessage(error, 'Sign-in could not be completed.'));
    }
  };

  const verifyCode = async () => {
    setFeedback(null);
    try {
      await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (signIn.status === 'complete') await finishSignIn();
      else setFeedback('That code was not accepted. Check it and try again.');
    } catch (error) {
      setFeedback(errorMessage(error, 'That code was not accepted. Check it and try again.'));
    }
  };

  const signInWithGoogle = async () => {
    setFeedback(null);
    setOauthBusy(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'runbuddy-mobile' }),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              setFeedback('Complete the security task in your Clerk account, then sign in again.');
              return;
            }
            router.replace(decorateUrl('/(tabs)/profile') as Href);
          },
        });
      } else {
        setFeedback('Google sign-in needs additional account details. Try email sign-in or complete setup on RunBuddy web.');
      }
    } catch (error) {
      setFeedback(errorMessage(error, 'Google sign-in could not be completed. Check the provider setup and try again.'));
    } finally {
      setOauthBusy(false);
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
          <Text style={[styles.brandLine, { color: colors.mutedForeground }]}>A little more joy in every mile.</Text>
        </View>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {needsCode ? 'Check your inbox' : 'Welcome back'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {needsCode
              ? 'Enter the one-time code to continue.'
              : 'Sign in and pick up where your next run begins.'}
          </Text>
        </View>
        {needsCode ? (
          <>
            <TextField
              label="Email verification code"
              value={code}
              onChangeText={setCode}
              placeholder="Enter the code"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              testID="sign-in-code"
            />
            <ActionButton
              title="Verify and continue"
              onPress={verifyCode}
              loading={busy}
              disabled={!code.trim()}
              icon="check"
              testID="verify-sign-in-code"
            />
            <ActionButton
              title="Send a new code"
              variant="outline"
              onPress={async () => {
                try {
                  await signIn.mfa.sendEmailCode();
                  setFeedback('A new code is on its way.');
                } catch (error) {
                  setFeedback(errorMessage(error));
                }
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setNeedsCode(false);
                setCode('');
                setFeedback(null);
                signIn.reset();
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
              testID="sign-in-email"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              testID="sign-in-password"
            />
            <ActionButton
              title="Sign in"
              onPress={submitPassword}
              loading={busy && fetchStatus === 'fetching'}
              disabled={!email.trim() || !password}
              icon="arrow-right"
              testID="sign-in-submit"
            />
            <View style={styles.separator}>
              <View style={[styles.rule, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.mutedForeground }]}>OR</Text>
              <View style={[styles.rule, { backgroundColor: colors.border }]} />
            </View>
            <ActionButton
              title="Continue with Google"
              variant="outline"
              icon="globe"
              onPress={signInWithGoogle}
              loading={oauthBusy}
              testID="sign-in-google"
            />
          </>
        )}
        {feedback ? (
          <View style={[styles.feedback, { backgroundColor: colors.muted }]}>
            <Feather name="info" size={16} color={colors.mutedForeground} />
            <Text accessibilityRole="alert" style={[styles.feedbackText, { color: colors.foreground }]}>{feedback}</Text>
          </View>
        ) : null}
        {!needsCode ? (
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>New to RunBuddy?</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={[styles.link, { color: colors.foreground }]}>Create an account</Text>
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
  brandLine: { fontFamily: 'Manrope_500Medium', fontSize: 12 },
  heading: { gap: 5, marginBottom: 2 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20 },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { height: 1, flex: 1 },
  orText: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1.2 },
  feedback: { padding: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  feedbackText: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 },
  footerText: { fontFamily: 'Manrope_500Medium', fontSize: 13 },
  link: { fontFamily: 'Manrope_700Bold', fontSize: 13, textDecorationLine: 'underline', paddingVertical: 9 },
});