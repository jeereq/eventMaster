import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './api';

const isNative = Platform.OS !== 'web';

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

let registeredToken: string | null = null;

async function getExpoProjectId(): Promise<string | undefined> {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

/**
 * Android 8+ : une notification a besoin d'un canal, et sur Android 13+ la
 * demande d'autorisation ne s'affiche pas tant qu'aucun canal n'existe.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#31714c',
  });
}

export async function requestPushPermissions(): Promise<boolean> {
  if (!isNative || !Device.isDevice) {
    return false;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!isNative || !Device.isDevice) {
    return null;
  }

  const granted = await requestPushPermissions();
  if (!granted) return null;

  const projectId = await getExpoProjectId();
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return tokenData.data;
}

export async function registerPushTokenWithBackend(): Promise<string | null> {
  try {
    const token = await getExpoPushToken();
    if (!token) return null;

    if (registeredToken === token) return token;

    await api.post('/notifications/push-token', {
      token,
      platform: Platform.OS,
    });
    registeredToken = token;
    return token;
  } catch (err) {
    console.warn('[Push] Enregistrement token échoué:', err);
    return null;
  }
}

/**
 * À appeler AVANT d'effacer le jeton de session : la route exige d'être
 * authentifié, sinon l'appareil reste lié à l'ancien compte.
 */
export async function unregisterPushTokenFromBackend(): Promise<void> {
  if (!registeredToken) return;

  try {
    await api.delete(`/notifications/push-token?token=${encodeURIComponent(registeredToken)}`);
  } catch {
    // ignore logout cleanup errors
  } finally {
    registeredToken = null;
  }
}

export function addNotificationResponseListener(
  handler: (data: Record<string, unknown> | undefined) => void,
) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    handler(data);
  });
  return () => subscription.remove();
}

export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
) {
  const subscription = Notifications.addNotificationReceivedListener(handler);
  return () => subscription.remove();
}

export async function getInitialNotificationData(): Promise<Record<string, unknown> | undefined> {
  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification.request.content.data as Record<string, unknown> | undefined;
}

export async function setBadgeCount(count: number): Promise<void> {
  if (!isNative) return;
  await Notifications.setBadgeCountAsync(count);
}
