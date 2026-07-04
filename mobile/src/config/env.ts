const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5001/api';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';

export const env = {
  apiUrl: API_URL.replace(/\/$/, ''),
  webUrl: WEB_URL.replace(/\/$/, ''),
} as const;
