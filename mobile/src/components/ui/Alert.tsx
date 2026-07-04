import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

interface AlertProps {
  variant: 'error' | 'success' | 'info';
  message: string;
}

export function Alert({ variant, message }: AlertProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'error' && styles.error,
        variant === 'success' && styles.success,
        variant === 'info' && styles.info,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'error' && styles.textError,
          variant === 'success' && styles.textSuccess,
          variant === 'info' && styles.textInfo,
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  error: {
    backgroundColor: colors.errorBg,
    borderColor: '#fecdd3',
  },
  success: {
    backgroundColor: colors.successBg,
    borderColor: '#a7f3d0',
  },
  info: {
    backgroundColor: colors.primaryLight,
    borderColor: '#c7d2fe',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  textError: {
    color: '#be123c',
  },
  textSuccess: {
    color: '#047857',
  },
  textInfo: {
    color: '#4338ca',
  },
});
