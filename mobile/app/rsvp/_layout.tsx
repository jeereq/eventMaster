import { Stack } from 'expo-router';

export default function RsvpLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#312e81' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#f8fafc' },
      }}
    />
  );
}
