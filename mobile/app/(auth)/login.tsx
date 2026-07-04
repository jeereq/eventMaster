import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import type { ApiError } from '../../src/lib/api';
import { Screen } from '../../src/components/ui/Screen';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Alert } from '../../src/components/ui/Alert';
import { colors } from '../../src/theme/colors';

export default function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!identifier.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      router.replace('/(app)/(tabs)');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.data?.notVerified && apiErr.data?.email) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            email: String(apiErr.data.email),
            method: String(apiErr.data.verificationMethod || 'EMAIL'),
          },
        });
        return;
      }
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Connexion"
      subtitle="Accédez à vos événements, invités et protocole jour J."
    >
      {error ? <Alert variant="error" message={error} /> : null}

      <View style={styles.form}>
        <Input
          label="Email ou WhatsApp"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="nom@exemple.com ou +243…"
          hint="Utilisez votre e-mail d'inscription ou votre numéro WhatsApp."
        />

        <Input
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}>
          <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        </Pressable>

        <Button title="Se connecter" onPress={handleSubmit} loading={loading} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.link}>Créer un compte</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
    marginTop: 8,
  },
  forgot: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  link: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
