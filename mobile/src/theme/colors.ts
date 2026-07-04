export const lightColors = {
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  primaryLight: '#eef2ff',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  error: '#e11d48',
  errorBg: '#fff1f2',
  success: '#059669',
  successBg: '#ecfdf5',
  indigo900: '#312e81',
  headerBg: '#312e81',
  headerText: '#ffffff',
  tabBar: '#ffffff',
} as const;

export const darkColors = {
  primary: '#818cf8',
  primaryDark: '#6366f1',
  primaryLight: '#1e1b4b',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#334155',
  error: '#fb7185',
  errorBg: '#4c0519',
  success: '#34d399',
  successBg: '#064e3b',
  indigo900: '#1e1b4b',
  headerBg: '#1e1b4b',
  headerText: '#e0e7ff',
  tabBar: '#1e293b',
} as const;

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  error: string;
  errorBg: string;
  success: string;
  successBg: string;
  indigo900: string;
  headerBg: string;
  headerText: string;
  tabBar: string;
};

/** @deprecated Préférez useTheme().colors */
export const colors = lightColors;
