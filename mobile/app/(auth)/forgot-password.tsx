import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/lib/api';
import type { VerificationMethod } from '../../src/types/auth';
import { Screen } from '../../src/components/ui/Screen';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Alert } from '../../src/components/ui/Alert';
import { colors } from '../../src/theme/colors';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState<VerificationMethod>('EMAIL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      setError('Saisissez votre e-mail ou numéro WhatsApp.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await api.post<{ message: string }>('/auth/forgot-password', {
        email: identifier.trim(),
        method,
      });
      setSuccess(data.message || 'Si le compte existe, un lien de réinitialisation a été envoyé.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Mot de passe oublié"
      subtitle="Recevez un lien de réinitialisation par e-mail ou WhatsApp."
    >
      {error ? <Alert variant="error" message={error} /> : null}
      {success ? <Alert variant="success" message={success} /> : null}

      {!success ? (
        <View style={styles.form}>
          <Input
            label="Email ou WhatsApp"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            placeholder="nom@exemple.com ou +243…"
          />

          <View style={styles.methodRow}>
            <Text style={styles.methodLabel}>Canal d'envoi</Text>
            <View style={styles.methodToggle}>
              {(['EMAIL', 'WHATSAPP'] as VerificationMethod[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMethod(m)}
                  style={[styles.methodBtn, method === m && styles.methodBtnActive]}
                >
                  <Text style={[styles.methodBtnText, method === m && styles.methodBtnTextActive]}>
                    {m === 'EMAIL' ? 'E-mail' : 'WhatsApp'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Button title="Envoyer le lien" onPress={handleSubmit} loading={loading} />
        </View>
      ) : (
        <Button title="Retour à la connexion" onPress={() => router.replace('/(auth)/login')} />
      )}

      {!success ? (
        <Button
          title="Retour à la connexion"
          onPress={() => router.back()}
          variant="ghost"
          style={styles.back}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
    marginTop: 8,
  },
  methodRow: {
    gap: 8,
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  methodToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  methodBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  methodBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  methodBtnTextActive: {
    color: colors.primary,
  },
  back: {
    marginTop: 8,
  },
});
