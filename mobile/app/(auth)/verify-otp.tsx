import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import type { VerificationMethod } from '../../src/types/auth';
import { Screen } from '../../src/components/ui/Screen';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Alert } from '../../src/components/ui/Alert';
import { colors } from '../../src/theme/colors';

export default function VerifyOtpScreen() {
  const { verifyOtp, resendOtp } = useAuth();
  const params = useLocalSearchParams<{ email?: string; method?: string }>();
  const email = params.email ?? '';
  const method = (params.method === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL') as VerificationMethod;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!email || !otp.trim()) {
      setError('Saisissez le code reçu.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await verifyOtp(email, otp.trim());
      router.replace('/(app)/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setError('');
    setInfo('');
    setResending(true);
    try {
      const message = await resendOtp(email, method);
      setInfo(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de renvoyer le code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen
      title="Validation du compte"
      subtitle={`Saisissez le code OTP reçu par ${method === 'WHATSAPP' ? 'WhatsApp' : 'e-mail'}.`}
    >
      {error ? <Alert variant="error" message={error} /> : null}
      {info ? <Alert variant="success" message={info} /> : null}

      <View style={styles.form}>
        <View style={styles.emailBox}>
          <Text style={styles.emailLabel}>Compte</Text>
          <Text style={styles.emailValue}>{email || '—'}</Text>
        </View>

        <Input
          label="Code OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          placeholder="123456"
          maxLength={6}
        />

        <Button title="Valider mon compte" onPress={handleVerify} loading={loading} />
        <Button
          title="Renvoyer le code"
          onPress={handleResend}
          loading={resending}
          variant="secondary"
        />
        <Button title="Retour à la connexion" onPress={() => router.replace('/(auth)/login')} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
    marginTop: 8,
  },
  emailBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});
