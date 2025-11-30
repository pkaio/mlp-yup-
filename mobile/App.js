import React from 'react';
import { Text, Platform } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, typography } from './src/theme/tokens';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Components
import ErrorBoundary from './src/components/ErrorBoundary';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import FeedScreen from './src/screens/FeedScreen';
import UploadScreen from './src/screens/UploadScreen';
import QuickUploadScreen from './src/screens/QuickUploadScreen';
import UploadModeSelectionScreen from './src/screens/UploadModeSelectionScreen';
import SmartUploadRouter from './src/screens/SmartUploadRouter';
import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SkillTreeScreen from './src/screens/SkillTreeScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Tab Navigator for authenticated users
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarAccessibilityLabel: route.name,
        tabBarIcon: ({ focused, color }) => {
          // Use emojis on web, icons on native
          if (Platform.OS === 'web') {
            const emojiLabels = {
              Feed: '🏠',
              Descobrir: '🔍',
              Upload: '➕',
              Mapa: '🗺️',
              Perfil: '👤',
            };
            return (
              <Text style={{ fontSize: focused ? 28 : 24 }}>
                {emojiLabels[route.name] || '🏠'}
              </Text>
            );
          }

          // Native icons for mobile
          let iconName;
          switch (route.name) {
            case 'Feed':
              iconName = 'home';
              break;
            case 'Descobrir':
              iconName = 'search';
              break;
            case 'Upload':
              iconName = 'add-circle-outline';
              break;
            case 'Mapa':
              iconName = 'map';
              break;
            case 'Perfil':
              iconName = 'person';
              break;
            default:
              iconName = 'home';
          }

          return <MaterialIcons name={iconName} size={focused ? 28 : 24} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 82,
          paddingBottom: spacing.md,
          paddingTop: spacing.md,
        },
        tabBarItemStyle: {
          paddingVertical: spacing.sm,
        },
      })}
    >
      <Tab.Screen name="Feed">
        {(props) => (
          <ErrorBoundary fallbackMessage="Erro ao carregar o Feed. Tente novamente.">
            <FeedScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>
      <Tab.Screen name="Descobrir">
        {(props) => (
          <ErrorBoundary fallbackMessage="Erro ao carregar Descobrir. Tente novamente.">
            <DiscoverScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>
      <Tab.Screen name="Upload">
        {(props) => (
          <ErrorBoundary fallbackMessage="Erro ao carregar Upload. Tente novamente.">
            <SmartUploadRouter {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>
      <Tab.Screen name="Mapa">
        {(props) => (
          <ErrorBoundary fallbackMessage="Erro ao carregar Mapa. Tente novamente.">
            <MapScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>
      <Tab.Screen name="Perfil">
        {(props) => (
          <ErrorBoundary fallbackMessage="Erro ao carregar Perfil. Tente novamente.">
            <ProfileScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.border,
        },
      }}
    >
      <StatusBar style="light" backgroundColor={colors.background} />

      {user ? (
        <Stack.Navigator>
          <Stack.Screen 
            name="Main" 
            component={MainTabs} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="VideoPlayer" 
            component={VideoPlayerScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="EditProfile" 
            component={EditProfileScreen}
            options={{ 
              title: 'Editar Perfil',
              headerStyle: { backgroundColor: colors.surfaceMuted, borderBottomWidth: 0 },
              headerTintColor: colors.textPrimary,
              headerTitleStyle: {
                fontSize: typography.sizes.md,
                fontWeight: typography.weights.bold,
              },
            }}
          />
          <Stack.Screen
            name="Achievements"
            options={{ headerShown: false }}
          >
            {(props) => (
              <ErrorBoundary fallbackMessage="Erro ao carregar Conquistas. Tente novamente.">
                <AchievementsScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="QuickUpload"
            options={{ headerShown: false }}
          >
            {(props) => (
              <ErrorBoundary fallbackMessage="Erro ao carregar Upload Rápido. Tente novamente.">
                <QuickUploadScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="UploadModeSelection"
            options={{ headerShown: false }}
          >
            {(props) => (
              <ErrorBoundary fallbackMessage="Erro ao carregar seleção de modo. Tente novamente.">
                <UploadModeSelectionScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="UploadManual"
            options={{ headerShown: false }}
          >
            {(props) => (
              <ErrorBoundary fallbackMessage="Erro ao carregar Upload Manual. Tente novamente.">
                <UploadScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="SkillTree"
            options={{ headerShown: false }}
          >
            {(props) => (
              <ErrorBoundary fallbackMessage="Erro ao carregar Skill Tree. Tente novamente.">
                <SkillTreeScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{ 
              title: 'Criar Conta',
              headerStyle: { backgroundColor: colors.surfaceMuted, borderBottomWidth: 0 },
              headerTintColor: colors.textPrimary,
              headerTitleStyle: {
                fontSize: typography.sizes.md,
                fontWeight: typography.weights.bold,
              },
            }}
          />
          <Stack.Screen
            name="VerifyEmail"
            component={VerifyEmailScreen}
            options={{
              title: 'Verificar e-mail',
              headerStyle: { backgroundColor: colors.surfaceMuted, borderBottomWidth: 0 },
              headerTintColor: colors.textPrimary,
              headerTitleStyle: {
                fontSize: typography.sizes.md,
                fontWeight: typography.weights.bold,
              },
            }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

// Main App Component
export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
