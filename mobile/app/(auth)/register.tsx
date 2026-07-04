import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import type { VerificationMethod } from '../../src/types/auth';
import { Screen } from '../../src/components/ui/Screen';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Alert } from '../../src/components/ui/Alert';
import { colors } from '../../src/theme/colors';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState<VerificationMethod>('EMAIL');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !tenantName.trim() || !email.trim() || !password) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (method === 'WHATSAPP' && !phone.trim()) {
      setError('Le numéro WhatsApp est obligatoire pour cette méthode.');
      return;
    }
    if (!acceptTerms) {
      setError('Vous devez accepter les conditions d\'utilisation.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await register(
        email.trim(),
        password,
        name.trim(),
        tenantName.trim(),
        phone.trim() || undefined,
        method,
        true,
        true,
      );

      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          email: result.email || email.trim(),
          method: result.verificationMethod || method,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Créer un compte"
      subtitle="Organisez vos événements privés avec EventMaster."
    >
      {error ? <Alert variant="error" message={error} /> : null}

      <View style={styles.form}>
        <Input label="Votre nom" value={name} onChangeText={setName} placeholder="Jean Dupont" />
        <Input
          label="Organisation"
          value={tenantName}
          onChangeText={setTenantName}
          placeholder="Agence Prestige"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="nom@exemple.com"
        />

        <View style={styles.methodRow}>
          <Text style={styles.methodLabel}>Validation du compte</Text>
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

        {method === 'WHATSAPP' ? (
          <Input
            label="Numéro WhatsApp"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+243…"
          />
        ) : null}

        <Input
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="8 caractères minimum"
        />

        <Pressable onPress={() => setAcceptTerms((v) => !v)} style={styles.termsRow}>
          <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
            {acceptTerms ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.termsText}>
            J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité.
          </Text>
        </Pressable>

        <Button title="Créer mon compte" onPress={handleSubmit} loading={loading} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà inscrit ? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.link}>Se connecter</Text>
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
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
