import React, { useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import YupButton from '../components/ui/YupButton';
import YupInput from '../components/ui/YupInput';
import YupCard from '../components/ui/YupCard';
import { useAuth } from '../context/AuthContext';
import { colors, gradients, spacing, typography } from '../theme/tokens';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1602781583981-a54924efadc0?auto=format&fit=crop&w=1200&q=80';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Erro', 'Por favor, insira um email válido');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        Alert.alert('Erro', result.error || 'Erro ao fazer login');
      }
    } catch (error) {
      Alert.alert(
        'Erro',
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
      );
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Y'UP CREW</Text>
            </View>
            <Text style={styles.heading}>Bem-vindo de volta</Text>
            <Text style={styles.subheading}>
              Faça login para continuar acompanhando as sessions, desafios e recompensas da sua crew.
            </Text>
          </View>

          <YupCard style={styles.formCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Acesse sua conta</Text>
              <Text style={styles.cardSubtitle}>
                Conecte-se com a comunidade de wakeboard e acompanhe os melhores rolês.
              </Text>
            </View>

            <View style={styles.form}>
              <YupInput
                label="E-mail"
                placeholder="voce@yup.app"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
              />

              <YupInput
                label="Senha"
                placeholder="Digite sua senha"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />

              <View style={styles.linkRow}>
                <TouchableOpacity>
                  <Text style={styles.link}>Esqueceu a senha?</Text>
                </TouchableOpacity>
              </View>

              <YupButton
                title={isLoading ? 'Entrando...' : 'Entrar'}
                onPress={handleLogin}
                isLoading={isLoading}
                disabled={isLoading}
              />
            </View>
          </YupCard>

          <View style={styles.footerLinks}>
            <Text style={styles.footerText}>Ainda não faz parte da crew?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerCta}>Criar conta agora</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroWrapper}>
            <ImageBackground
              source={{ uri: HERO_IMAGE }}
              style={styles.heroImage}
              resizeMode="cover"
            >
              <LinearGradient
                colors={gradients.hero}
                style={styles.heroGradient}
              />
            </ImageBackground>
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
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['3xl'],
    gap: spacing['3xl'],
  },
  header: {
    gap: spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs * 1.5,
    borderRadius: spacing['2xl'],
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryOutline,
  },
  badgeText: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 2.8,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.6,
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    lineHeight: typography.sizes['2xl'],
  },
  formCard: {
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing['2xl'],
    gap: spacing['2xl'],
  },
  cardHeader: {
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    letterSpacing: 0.4,
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.lg,
  },
  form: {
    gap: spacing.lg,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  link: {
    color: colors.accent,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  footerLinks: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  footerCta: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.3,
  },
  heroWrapper: {
    borderRadius: spacing['3xl'],
    overflow: 'hidden',
    height: 220,
  },
  heroImage: {
    flex: 1,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
