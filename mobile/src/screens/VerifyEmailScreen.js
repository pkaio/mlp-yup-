import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import YupCard from '../components/ui/YupCard';
import YupButton from '../components/ui/YupButton';
import YupInput from '../components/ui/YupInput';
import YupSectionHeader from '../components/ui/YupSectionHeader';
import { colors, spacing, typography } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';

const RESEND_COOLDOWN_SECONDS = 90;

export default function VerifyEmailScreen({ navigation }) {
  const route = useRoute();
  const initialEmail = route.params?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { verifyEmail, resendVerification } = useAuth();

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const interval = setInterval(() => {
      setCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!email || !code) {
      Alert.alert('Erro', 'Informe seu e-mail e o código recebido.');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Erro', 'O código deve conter 6 dígitos.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyEmail(email.trim(), code.trim());
      if (result.success) {
        Alert.alert('Sucesso', 'E-mail verificado! Bem-vindo ao Y\'UP.', [
          {
            text: 'Continuar',
            onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }),
          },
        ]);
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível verificar o e-mail.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Erro', 'Informe um e-mail válido.');
      return;
    }

    setIsResending(true);

    try {
      const result = await resendVerification(email.trim());
      if (result.success) {
        Alert.alert('Sucesso', result.message || 'Novo código enviado!');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível reenviar o código.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao conectar com o servidor.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <YupSectionHeader
            title="Verifique seu e-mail"
            subtitle="Enviamos um código de 6 dígitos para o seu e-mail. Confirme para ativar a conta."
          />

          <YupCard style={styles.formCard}>
            <YupInput
              label="E-mail"
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Código de verificação</Text>
              <TextInput
                style={styles.codeInput}
                placeholder="000000"
                placeholderTextColor={colors.textSecondary}
                value={code}
                onChangeText={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                editable={!isLoading}
              />
              <Text style={styles.fieldHint}>Digite o código de 6 dígitos recebido por e-mail.</Text>
            </View>

            <YupButton
              title={isLoading ? 'Validando...' : 'Validar código'}
              onPress={handleVerify}
              isLoading={isLoading}
              disabled={isLoading}
            />

            <TouchableOpacity
              style={[styles.resendButton, (isResending || cooldown > 0) && styles.resendButtonDisabled]}
              onPress={handleResend}
              disabled={isResending || cooldown > 0}
              activeOpacity={0.85}
            >
              <Text style={styles.resendText}>
                {cooldown > 0
                  ? `Reenviar código em ${cooldown}s`
                  : isResending
                  ? 'Reenviando...'
                  : 'Reenviar código'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')} disabled={isLoading}>
              <Text style={styles.backText}>Voltar para o login</Text>
            </TouchableOpacity>
          </YupCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing['3xl'],
    paddingTop: spacing['3xl'],
    gap: spacing['2xl'],
  },
  formCard: {
    gap: spacing['2xl'],
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing['2xl'],
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  codeInput: {
    borderRadius: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    letterSpacing: 4,
    textAlign: 'center',
  },
  fieldHint: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
});
