import React, { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { navigateFromDeepLink, navigateFromNotificationData } from '../lib/deepLinks';
import {
  addNotificationResponseListener,
  getInitialNotificationData,
  registerPushTokenWithBackend,
  setBadgeCount,
  unregisterPushTokenFromBackend,
} from '../lib/pushNotifications';
import { fetchNotifications } from '../lib/eventsApi';

export function AppBootstrap() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    Linking.getInitialURL().then((url) => {
      if (url) navigateFromDeepLink(url);
    });

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      navigateFromDeepLink(url);
    });

    return () => linkSub.remove();
  }, [loading]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    registerPushTokenWithBackend().catch(() => undefined);

    getInitialNotificationData().then((data) => {
      if (data) navigateFromNotificationData(data);
    });

    const removeListener = addNotificationResponseListener((data) => {
      navigateFromNotificationData(data);
    });

    fetchNotifications(1)
      .then((res) => setBadgeCount(res.unreadCount))
      .catch(() => undefined);

    return () => removeListener();
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (loading || isAuthenticated) return;
    unregisterPushTokenFromBackend().catch(() => undefined);
    setBadgeCount(0).catch(() => undefined);
  }, [isAuthenticated, loading]);

  return null;
}
