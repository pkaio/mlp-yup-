import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import YupInput from '../components/ui/YupInput';
import YupButton from '../components/ui/YupButton';
import YupCard from '../components/ui/YupCard';
import { colors, spacing, typography } from '../theme/tokens';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !username) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Erro', 'Por favor, insira um email válido');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Erro', 'O nome de usuário deve ter pelo menos 3 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        email,
        password,
        username,
        fullName,
      });
      
      if (result.success) {
        Alert.alert('Sucesso', 'Conta criada com sucesso!');
      } else {
        Alert.alert('Erro', result.error || 'Erro ao criar conta');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Nova crew</Text>
            </View>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>
              Monte seu perfil, acompanhe desafios e compartilhe suas sessions com a comunidade.
            </Text>
          </View>

          <YupCard style={styles.formCard}>
            <View style={styles.formStack}>
              <YupInput
                label="Nome completo"
                placeholder="Seu nome"
                value={fullName}
                onChangeText={setFullName}
                editable={!isLoading}
              />

              <YupInput
                label="Nome de usuário *"
                placeholder="@seuusuario"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                editable={!isLoading}
              />

              <YupInput
                label="Email *"
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
              />

              <YupInput
                label="Senha *"
                placeholder="Digite sua senha"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />

              <YupInput
                label="Confirmar senha *"
                placeholder="Repita sua senha"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isLoading}
              />

              <YupButton
                title={isLoading ? 'Criando conta...' : 'Criar conta'}
                onPress={handleRegister}
                isLoading={isLoading}
                disabled={isLoading}
              />
            </View>
          </YupCard>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já faz parte da crew?</Text>
          <YupButton
            variant="ghost"
            title="Fazer login"
            onPress={() => navigation.goBack()}
            fullWidth={false}
            style={styles.loginButton}
          />
          </View>
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
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing['3xl'],
    paddingTop: spacing['3xl'],
    gap: spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryOutline,
  },
  badgeText: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    lineHeight: typography.sizes['2xl'],
    textAlign: 'center',
  },
  formCard: {
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing['2xl'],
  },
  formStack: {
    gap: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  loginButton: {
    paddingHorizontal: spacing['2xl'],
    alignSelf: 'center',
  },
});
