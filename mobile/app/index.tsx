import { Redirect } from 'expo-router';
import { useAuth, getHomeRoute } from '../src/context/AuthContext';
import { Screen } from '../src/components/ui/Screen';

export default function Index() {
  const { loading, user, access, isAuthenticated } = useAuth();

  if (loading) {
    return <Screen loading />;
  }

  if (isAuthenticated && user) {
    return <Redirect href={getHomeRoute(user, access) as never} />;
  }

  return <Redirect href="/(auth)/login" />;
}
