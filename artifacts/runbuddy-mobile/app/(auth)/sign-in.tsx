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
import { useAuth, useSession, useSignIn, useSSO } from '@clerk/expo';
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

type PasswordResetStep = 'email' | 'code' | 'password';

const resetCodeNotice =
  "If an account exists for this email, we'll send a password reset code shortly.";

const isUnknownAccountError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'form_identifier_not_found';

export default function SignInScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: sessionLoaded, session } = useSession();
  const { signIn, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [passwordResetStep, setPasswordResetStep] = useState<PasswordResetStep | null>(null);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
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

  useEffect(() => {
    if (!authLoaded || !sessionLoaded || !isSignedIn || needsCode || passwordResetStep) return;
    if (session?.currentTask) {
      setFeedback('Complete the security task in your Clerk account, then sign in again.');
      return;
    }
    router.replace('/(tabs)/profile' as Href);
  }, [authLoaded, sessionLoaded, isSignedIn, needsCode, passwordResetStep, router, session?.currentTask]);

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

  const openPasswordReset = () => {
    void signIn.reset();
    setPassword('');
    setCode('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setFeedback(null);
    setPasswordResetStep('email');
  };

  const returnToSignIn = () => {
    void signIn.reset();
    setPasswordResetStep(null);
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setFeedback(null);
  };

  const sendPasswordResetCode = async () => {
    setFeedback(null);
    try {
      await signIn.reset();
      const created = await signIn.create({ identifier: email.trim() });
      if (created.error) {
        if (isUnknownAccountError(created.error)) {
          setPasswordResetStep('code');
          setFeedback(resetCodeNotice);
          return;
        }
        setFeedback(errorMessage(created.error, 'Could not start password reset. Check your email and try again.'));
        return;
      }

      const sent = await signIn.resetPasswordEmailCode.sendCode();
      if (sent.error) {
        if (isUnknownAccountError(sent.error)) {
          setPasswordResetStep('code');
          setFeedback(resetCodeNotice);
          return;
        }
        setFeedback(errorMessage(sent.error, 'Could not send a password reset code. Try again.'));
        return;
      }

      setPasswordResetStep('code');
      setFeedback(resetCodeNotice);
    } catch (error) {
      setFeedback(errorMessage(error, 'Could not send a password reset code. Try again.'));
    }
  };

  const verifyPasswordResetCode = async () => {
    setFeedback(null);
    try {
      const result = await signIn.resetPasswordEmailCode.verifyCode({
        code: resetCode.trim(),
      });
      if (result.error) {
        setFeedback(errorMessage(result.error, 'That code could not be verified. Check it and try again.'));
        return;
      }
      if (signIn.status === 'needs_new_password') {
        setPasswordResetStep('password');
        return;
      }
      setFeedback('The reset could not continue. Request a new code and try again.');
    } catch (error) {
      setFeedback(errorMessage(error, 'That code could not be verified. Check it and try again.'));
    }
  };

  const resendPasswordResetCode = async () => {
    setFeedback(null);
    try {
      const result = await signIn.resetPasswordEmailCode.sendCode();
      if (result.error && !isUnknownAccountError(result.error)) {
        setFeedback(errorMessage(result.error, 'Could not send a new code. Try again.'));
        return;
      }
      setFeedback(resetCodeNotice);
    } catch (error) {
      setFeedback(errorMessage(error, 'Could not send a new code. Try again.'));
    }
  };

  const submitNewPassword = async () => {
    setFeedback(null);
    if (newPassword !== confirmNewPassword) {
      setFeedback('Those passwords do not match.');
      return;
    }
    try {
      const result = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });
      if (result.error) {
        setFeedback(errorMessage(result.error, 'Could not update your password. Try a different password.'));
        return;
      }
      if (signIn.status !== 'complete') {
        setFeedback('The password reset could not be completed. Request a new code and try again.');
        return;
      }
      await signIn.reset();
      setPasswordResetStep(null);
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setFeedback('Your password has been reset. Sign in with your new password.');
    } catch (error) {
      setFeedback(errorMessage(error, 'Could not update your password. Try again.'));
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
            {needsCode
              ? 'Check your inbox'
              : passwordResetStep === 'email'
                ? 'Reset your password'
                : passwordResetStep === 'code'
                  ? 'Check your inbox'
                  : passwordResetStep === 'password'
                    ? 'Choose a new password'
                    : 'Welcome back'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {needsCode
              ? 'Enter the one-time code to continue.'
              : passwordResetStep === 'email'
                ? 'Enter the email address on your RunBuddy account.'
                : passwordResetStep === 'code'
                  ? 'Enter the password reset code sent to your email.'
                  : passwordResetStep === 'password'
                    ? 'Choose a new password for your account.'
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
        ) : passwordResetStep ? (
          <>
            {passwordResetStep === 'email' ? (
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
                  testID="reset-password-email"
                />
                <ActionButton
                  title="Send reset code"
                  onPress={sendPasswordResetCode}
                  loading={busy}
                  disabled={!email.trim()}
                  icon="arrow-right"
                  testID="send-reset-password-code"
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={returnToSignIn}
                  testID="reset-password-back-to-sign-in"
                >
                  <Text style={[styles.link, { color: colors.foreground }]}>Back to sign in</Text>
                </Pressable>
              </>
            ) : null}
            {passwordResetStep === 'code' ? (
              <>
                <TextField
                  label="Password reset code"
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder="Enter the code"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  testID="reset-password-code"
                />
                <ActionButton
                  title="Verify code"
                  onPress={verifyPasswordResetCode}
                  loading={busy}
                  disabled={!resetCode.trim()}
                  icon="check"
                  testID="verify-reset-password-code"
                />
                <ActionButton
                  title="Send a new code"
                  variant="outline"
                  onPress={resendPasswordResetCode}
                  loading={busy}
                  icon="mail"
                  testID="resend-reset-password-code"
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={openPasswordReset}
                  testID="reset-password-change-email"
                >
                  <Text style={[styles.link, { color: colors.foreground }]}>Use a different email</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={returnToSignIn}>
                  <Text style={[styles.link, { color: colors.foreground }]}>Back to sign in</Text>
                </Pressable>
              </>
            ) : null}
            {passwordResetStep === 'password' ? (
              <>
                <TextField
                  label="New password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Choose a new password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  testID="reset-password-new"
                />
                <TextField
                  label="Confirm new password"
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder="Enter it again"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  testID="reset-password-confirm"
                />
                <ActionButton
                  title="Update password"
                  onPress={submitNewPassword}
                  loading={busy}
                  disabled={!newPassword || !confirmNewPassword}
                  icon="check"
                  testID="submit-reset-password"
                />
              </>
            ) : null}
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
            <Pressable
              accessibilityRole="button"
              onPress={openPasswordReset}
              testID="forgot-password"
            >
              <Text style={[styles.link, { color: colors.foreground }]}>Reset password</Text>
            </Pressable>
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
        {!needsCode && !passwordResetStep ? (
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