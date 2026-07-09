import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  LayoutChangeEvent,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSQLiteContext } from 'expo-sqlite';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { SessionsStackParamList } from '../navigation/AppNavigator';
import { addGroup } from '../db/database';
import { detectHoles, Hole } from '../vision/detectHoles';
import { decodeJpegBase64 } from '../vision/decodeImage';
import {
  groupSizeMm,
  mmToMoa,
  parseCaliberMm,
  mmPerPxFromCaliber,
  extremeSpreadPx,
} from '../vision/groupSize';

type Route = RouteProp<SessionsStackParamList, 'ScanTarget'>;

const ANALYSIS_WIDTH = 1000;

export default function ScanTargetScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const { sessionId, distanceM, caliber } = useRoute<Route>().params;

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const [holes, setHoles] = useState<Hole[]>([]);
  const [busy, setBusy] = useState(false);
  const [caliberText, setCaliberText] = useState(caliber ?? '');
  const [viewWidth, setViewWidth] = useState(0);

  const caliberMm = parseCaliberMm(caliberText);
  const sizeMm = caliberMm !== null ? groupSizeMm(holes, caliberMm) : null;
  const moa = sizeMm !== null ? mmToMoa(sizeMm, distanceM) : null;

  const medianRadius = useMemo(() => {
    if (holes.length === 0) return 8;
    const rs = holes.map((h) => h.radiusPx).sort((a, b) => a - b);
    return rs[rs.length >> 1];
  }, [holes]);

  const analyze = async (fromCamera: boolean) => {
    const picker = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Camera access is required to scan targets.');
        return;
      }
    }
    const res = await picker({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled || !res.assets[0]) return;

    setBusy(true);
    try {
      const resized = await ImageManipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: ANALYSIS_WIDTH } }],
        { base64: true, compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      const raw = decodeJpegBase64(resized.base64!);
      setPhotoUri(resized.uri);
      setImgSize({ w: raw.width, h: raw.height });
      setHoles(detectHoles(raw));
    } catch (e) {
      Alert.alert('Analysis failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  // Tap on overlay: near an existing hole → remove it; elsewhere → add one.
  const onOverlayPress = (e: GestureResponderEvent) => {
    if (viewWidth === 0) return;
    const scale = imgSize.w / viewWidth;
    const x = e.nativeEvent.locationX * scale;
    const y = e.nativeEvent.locationY * scale;
    const hitRadius = Math.max(medianRadius * 2.5, 20);

    let nearest = -1;
    let nearestD = Infinity;
    holes.forEach((h, i) => {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < nearestD) {
        nearestD = d;
        nearest = i;
      }
    });

    if (nearest >= 0 && nearestD <= hitRadius) {
      setHoles(holes.filter((_, i) => i !== nearest));
    } else {
      setHoles([
        ...holes,
        { x, y, radiusPx: medianRadius, area: 0, circularity: 1 },
      ]);
    }
  };

  const handleSave = async () => {
    if (sizeMm === null) return;
    await addGroup(db, {
      sessionId,
      sizeMm: Math.round(sizeMm * 10) / 10,
      shotCount: holes.length,
      label: 'Scanned',
    });
    navigation.goBack();
  };

  const displayHeight = viewWidth > 0 ? (imgSize.h / imgSize.w) * viewWidth : 0;
  const displayScale = viewWidth > 0 ? viewWidth / imgSize.w : 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pickRow}>
        <TouchableOpacity style={styles.pickBtn} onPress={() => analyze(true)}>
          <Ionicons name="camera-outline" size={20} color={COLORS.background} />
          <Text style={styles.pickBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickBtn} onPress={() => analyze(false)}>
          <Ionicons name="images-outline" size={20} color={COLORS.background} />
          <Text style={styles.pickBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {busy && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />}

      {photoUri && !busy && (
        <>
          <View
            onLayout={(e: LayoutChangeEvent) => setViewWidth(e.nativeEvent.layout.width)}
            style={styles.imageWrap}
          >
            <Image
              source={{ uri: photoUri }}
              style={{ width: '100%', height: displayHeight }}
              resizeMode="contain"
            />
            <Svg
              style={StyleSheet.absoluteFill}
              onPress={onOverlayPress}
              width={viewWidth}
              height={displayHeight}
            >
              {holes.map((h, i) => (
                <Circle
                  key={i}
                  cx={h.x * displayScale}
                  cy={h.y * displayScale}
                  r={Math.max(h.radiusPx * displayScale * 1.6, 10)}
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fill="none"
                />
              ))}
            </Svg>
          </View>
          <Text style={styles.hint}>
            Tap a marker to remove it · tap a missed hole to add it
          </Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Caliber (for scale) *</Text>
            <TextInput
              style={styles.input}
              value={caliberText}
              onChangeText={setCaliberText}
              placeholder='e.g. .308, 5.56, 9mm'
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={styles.resultRow}>
              <Result label="Holes" value={String(holes.length)} />
              <Result
                label="Group"
                value={sizeMm !== null ? `${sizeMm.toFixed(1)} mm` : '—'}
              />
              <Result
                label="MOA"
                value={moa !== null ? moa.toFixed(2) : '—'}
              />
            </View>
            {holes.length >= 2 && caliberMm === null && (
              <Text style={styles.warn}>Enter a caliber to compute size.</Text>
            )}
            {holes.length < 2 && (
              <Text style={styles.warn}>Need at least 2 holes.</Text>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, sizeMm === null && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={sizeMm === null}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.background} />
              <Text style={styles.pickBtnText}>Save Group</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {!photoUri && !busy && (
        <Text style={styles.hint}>
          Photograph the target flat-on in even light. Dark holes on light paper
          are detected automatically; you can correct by tapping.
        </Text>
      )}
    </ScrollView>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.result}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 60 },
  pickRow: { flexDirection: 'row', gap: SPACING.sm },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
  },
  pickBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 16 },
  imageWrap: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 16,
  },
  resultRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  result: { flex: 1, alignItems: 'center' },
  resultLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultValue: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  warn: { fontSize: 12, color: COLORS.danger, marginTop: SPACING.sm, textAlign: 'center' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  saveBtnDisabled: { opacity: 0.4 },
});
