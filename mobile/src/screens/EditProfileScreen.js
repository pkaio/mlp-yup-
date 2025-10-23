import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import YupCard from '../components/ui/YupCard';
import YupSectionHeader from '../components/ui/YupSectionHeader';
import YupButton from '../components/ui/YupButton';
import YupInput from '../components/ui/YupInput';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { colors, radii, spacing, typography } from '../theme/tokens';

const PREFERENCE_ITEMS = [
  {
    key: 'notifications',
    title: 'Notificações',
    subtitle: 'Gerencie alertas e lembretes',
    icon: 'notifications-none',
    tint: '#00BFFF',
    background: 'rgba(0,191,255,0.12)',
  },
  {
    key: 'privacy',
    title: 'Privacidade',
    subtitle: 'Controle quem vê suas sessions',
    icon: 'privacy-tip',
    tint: '#818CF8',
    background: 'rgba(129,140,248,0.12)',
  },
  {
    key: 'support',
    title: 'Central de ajuda',
    subtitle: 'Dicas, suporte e comunidade',
    icon: 'help-outline',
    tint: '#F97316',
    background: 'rgba(249,115,22,0.12)',
  },
];

export default function EditProfileScreen() {
  const { user, updateUser, logout } = useAuth();
  const [fullName, setFullName] = useState(user.full_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [imageUrl, setImageUrl] = useState(user.profile_image_url || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio');
      return;
    }

    setSaving(true);

    try {
      const result = await authService.updateProfile({
        fullName: fullName.trim(),
        bio: bio.trim(),
      });

      if (result.error) {
        Alert.alert('Erro', result.error);
      } else {
        updateUser({ ...user, full_name: fullName, bio });
        Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const selectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua biblioteca de fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImageUrl(uri);

        try {
          await authService.updateProfileImage(uri);
          updateUser({ ...user, profile_image_url: uri });
        } catch (error) {
          console.error('Erro ao atualizar imagem:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <YupSectionHeader
          title="Editar perfil"
          subtitle="Atualize suas informações e personalize sua presença na crew"
        />

        <YupCard style={styles.avatarCard}>
          <TouchableOpacity style={styles.avatarButton} onPress={selectImage} activeOpacity={0.85}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="person" size={42} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Icon name="photo-camera" size={18} color={colors.textPrimary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toque para alterar sua foto</Text>
        </YupCard>

        <YupCard style={styles.formCard}>
          <YupInput
            label="Nome completo"
            placeholder="Seu nome completo"
            value={fullName}
            onChangeText={setFullName}
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Biografia</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Conte um pouco sobre você..."
              placeholderTextColor={colors.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{bio.length}/500</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.disabledInput}>
              <Icon name="mail-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.disabledText}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nome de usuário</Text>
            <View style={styles.disabledInput}>
              <Icon name="alternate-email" size={18} color={colors.textSecondary} />
              <Text style={styles.disabledText}>@{user.username}</Text>
            </View>
          </View>
        </YupCard>

        <YupCard>
          <YupSectionHeader
            title="Preferências"
            subtitle="Personalize sua jornada Y’UP"
            style={styles.sectionHeader}
          />

          <View style={styles.preferenceList}>
            {PREFERENCE_ITEMS.map((item) => (
              <TouchableOpacity key={item.key} style={styles.preferenceRow} activeOpacity={0.8}>
                <View style={[styles.preferenceIcon, { backgroundColor: item.background }]}>
                  <Icon name={item.icon} size={20} color={item.tint} />
                </View>
                <View style={styles.preferenceContent}>
                  <Text style={styles.preferenceTitle}>{item.title}</Text>
                  <Text style={styles.preferenceSubtitle}>{item.subtitle}</Text>
                </View>
                <Icon name="chevron-right" size={20} color="rgba(148,163,184,0.7)" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.preferenceRow, styles.preferenceDanger]}
              activeOpacity={0.8}
              onPress={handleLogout}
            >
              <View style={[styles.preferenceIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}> 
                <Icon name="logout" size={20} color={colors.danger} />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={[styles.preferenceTitle, styles.preferenceDangerLabel]}>Sair</Text>
                <Text style={styles.preferenceSubtitle}>Encerrar sessão atual</Text>
              </View>
              <Icon name="chevron-right" size={20} color="rgba(239,68,68,0.7)" />
            </TouchableOpacity>
          </View>
        </YupCard>

        <YupButton
          title={saving ? 'Salvando...' : 'Salvar alterações'}
          onPress={handleSave}
          isLoading={saving}
          disabled={saving}
        />

        <Text style={styles.helper}>
          Atualize seu perfil para desbloquear recomendações personalizadas e facilitar conexões com outros riders.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing['3xl'],
    gap: spacing['2xl'],
  },
  avatarCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
  },
  avatarButton: {
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarHint: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  formCard: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  textarea: {
    minHeight: 120,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
  },
  counter: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    alignSelf: 'flex-end',
  },
  disabledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  disabledText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: typography.sizes.md,
  },
  sectionHeader: {
    marginBottom: spacing.lg,
  },
  preferenceList: {
    gap: spacing.sm,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  preferenceDanger: {
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  preferenceIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceContent: {
    flex: 1,
    gap: spacing.xs,
  },
  preferenceTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  preferenceSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  preferenceDangerLabel: {
    color: colors.danger,
  },
});
