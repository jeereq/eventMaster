import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../../theme/colors';

interface QrScannerProps {
  active: boolean;
  onScan: (payload: string) => void;
  onError?: (message: string) => void;
}

export function QrScanner({ active, onScan, onError }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const handledRef = useRef(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!active) {
      handledRef.current = false;
    }
  }, [active]);

  useEffect(() => {
    if (!active || !permission || permission.granted) return;

    setRequesting(true);
    requestPermission()
      .then((result) => {
        if (!result.granted) {
          onError?.('Accès à la caméra refusé. Autorisez la caméra dans les réglages.');
        }
      })
      .catch(() => onError?.('Impossible de demander l\'accès à la caméra.'))
      .finally(() => setRequesting(false));
  }, [active, permission, requestPermission, onError]);

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (!active || handledRef.current || !data.trim()) return;
      handledRef.current = true;
      onScan(data.trim());
    },
    [active, onScan],
  );

  if (!active) return null;

  if (!permission) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          La caméra est nécessaire pour scanner les QR codes des invités.
        </Text>
        <Pressable
          style={styles.permissionBtn}
          onPress={() => {
            setRequesting(true);
            requestPermission().finally(() => setRequesting(false));
          }}
          disabled={requesting}
        >
          {requesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.permissionBtnText}>Autoriser la caméra</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handledRef.current ? undefined : handleBarcode}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Cadrez le QR code de l&apos;invitation</Text>
      </View>
    </View>
  );
}

export function QrScannerToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={[styles.toggle, active && styles.toggleActive]}>
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
        {active ? '📷 Arrêter le scan' : '📷 Scanner un QR code'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 280,
    backgroundColor: '#0f172a',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  frame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  placeholder: {
    height: 200,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  placeholderText: {
    color: '#e2e8f0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 180,
    alignItems: 'center',
  },
  permissionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  toggle: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  toggleTextActive: {
    color: colors.primary,
  },
});
