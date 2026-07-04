import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Screen } from '../../src/components/ui/Screen';

export default function AppLayout() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <Screen loading />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="events/[id]"
        options={{
          headerShown: true,
          title: 'Événement',
          headerStyle: { backgroundColor: '#312e81' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="protocol/[eventId]"
        options={{
          headerShown: true,
          title: 'Protocole jour J',
          headerStyle: { backgroundColor: '#312e81' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
