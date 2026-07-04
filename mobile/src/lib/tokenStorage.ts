import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'eventmaster_token';

function webGetToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function webSetToken(token: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function readStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webGetToken();
  }

  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function writeStoredToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    webSetToken(token);
    return;
  }

  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export { TOKEN_KEY };
