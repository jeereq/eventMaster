import { Redirect, useLocalSearchParams } from 'expo-router';

export default function EventDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return <Redirect href="/(app)/(tabs)/events" />;
  }

  return <Redirect href={`/(app)/events/${id}` as never} />;
}
