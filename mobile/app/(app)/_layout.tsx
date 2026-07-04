import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Screen } from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function AppLayout() {
  const { loading, isAuthenticated } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return <Screen loading />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const headerOptions = {
    headerShown: true as const,
    headerStyle: { backgroundColor: colors.headerBg },
    headerTintColor: colors.headerText,
    headerTitleStyle: { fontWeight: '700' as const },
    presentation: 'card' as const,
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="about" options={{ ...headerOptions, title: 'À propos' }} />
      <Stack.Screen name="events/[id]" options={{ ...headerOptions, title: 'Événement' }} />
      <Stack.Screen name="protocol/[eventId]" options={{ ...headerOptions, title: 'Protocole jour J' }} />
    </Stack>
  );
}
