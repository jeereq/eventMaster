import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface AlertProps {
  variant: 'error' | 'success' | 'info';
  message: string;
}

export function Alert({ variant, message }: AlertProps) {
  const { colors } = useTheme();

  const variantStyles = {
    error: { bg: colors.errorBg, border: colors.error, text: colors.error },
    success: { bg: colors.successBg, border: colors.success, text: colors.success },
    info: { bg: colors.primaryLight, border: colors.primary, text: colors.primaryDark },
  }[variant];

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: variantStyles.bg, borderColor: variantStyles.border },
      ]}
    >
      <Text style={[styles.text, { color: variantStyles.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
