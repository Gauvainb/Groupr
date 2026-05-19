import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { addSession, getEquipment } from '../db/database';
import { DISCIPLINES, EQUIPMENT_TYPES, Equipment } from '../types';
import { SessionsStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<SessionsStackParamList>;
type Route = RouteProp<SessionsStackParamList, 'AddSession'>;

export default function AddSessionScreen() {
  const db = useSQLiteContext();
  const nav = useNavigation<Nav>();
  useRoute<Route>();

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const [distance, setDistance] = useState('100');
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'yd'>('m');
  const [shots, setShots] = useState('10');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [ammoDescription, setAmmoDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<
    number | undefined
  >();

  useEffect(() => {
    getEquipment(db).then(setEquipment);
  }, [db]);

  const handleSave = async () => {
    const dist = parseFloat(distance);
    const shotsNum = parseInt(shots, 10);
    if (isNaN(dist) || dist <= 0) {
      Alert.alert('Validation', 'Enter a valid distance.');
      return;
    }
    if (isNaN(shotsNum) || shotsNum <= 0) {
      Alert.alert('Validation', 'Enter a valid shot count.');
      return;
    }
    const sessionId = await addSession(db, {
      date: date.toISOString().split('T')[0],
      discipline,
      distance: dist,
      distanceUnit,
      equipmentId: selectedEquipmentId,
      shots: shotsNum,
      score: score ? parseFloat(score) : undefined,
      maxScore: maxScore ? parseFloat(maxScore) : undefined,
      ammoDescription: ammoDescription || undefined,
      notes: notes || undefined,
    });
    nav.replace('SessionDetail', { sessionId });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Date */}
      <Text style={styles.label}>Date</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.inputText}>{date.toLocaleDateString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          themeVariant="dark"
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) setDate(d);
          }}
        />
      )}

      {/* Discipline */}
      <Text style={styles.label}>Discipline</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={discipline}
          onValueChange={(v) => setDiscipline(v)}
          style={styles.picker}
          dropdownIconColor={COLORS.textMuted}
        >
          {DISCIPLINES.map((d) => (
            <Picker.Item key={d} label={d} value={d} color={COLORS.text} />
          ))}
        </Picker>
      </View>

      {/* Distance */}
      <Text style={styles.label}>Distance</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={distance}
          onChangeText={setDistance}
          keyboardType="decimal-pad"
          placeholder="100"
          placeholderTextColor={COLORS.textMuted}
        />
        {(['m', 'yd'] as const).map((u) => (
          <TouchableOpacity
            key={u}
            style={[styles.unitBtn, distanceUnit === u && styles.unitBtnActive]}
            onPress={() => setDistanceUnit(u)}
          >
            <Text
              style={[
                styles.unitBtnText,
                distanceUnit === u && styles.unitBtnTextActive,
              ]}
            >
              {u}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Firearm */}
      <Text style={styles.label}>Firearm (optional)</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedEquipmentId ?? ''}
          onValueChange={(v) =>
            setSelectedEquipmentId(v === '' ? undefined : Number(v))
          }
          style={styles.picker}
          dropdownIconColor={COLORS.textMuted}
        >
          <Picker.Item label="None" value="" color={COLORS.textMuted} />
          {equipment.map((e) => (
            <Picker.Item
              key={e.id}
              label={`${e.name}  ·  ${e.caliber}`}
              value={e.id}
              color={COLORS.text}
            />
          ))}
        </Picker>
      </View>

      {/* Shots */}
      <Text style={styles.label}>Number of shots</Text>
      <TextInput
        style={styles.input}
        value={shots}
        onChangeText={setShots}
        keyboardType="number-pad"
        placeholder="10"
        placeholderTextColor={COLORS.textMuted}
      />

      {/* Score */}
      <Text style={styles.label}>Score (optional)</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={score}
          onChangeText={setScore}
          keyboardType="decimal-pad"
          placeholder="Score"
          placeholderTextColor={COLORS.textMuted}
        />
        <Text style={styles.slash}>/</Text>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={maxScore}
          onChangeText={setMaxScore}
          keyboardType="decimal-pad"
          placeholder="Max"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {/* Ammo */}
      <Text style={styles.label}>Ammunition (optional)</Text>
      <TextInput
        style={styles.input}
        value={ammoDescription}
        onChangeText={setAmmoDescription}
        placeholder="e.g. Federal GM 168gr BTHP · Lot #A42"
        placeholderTextColor={COLORS.textMuted}
      />

      {/* Notes */}
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Wind, lighting, adjustments made…"
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 60 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputText: { color: COLORS.text, fontSize: 16 },
  pickerWrapper: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  picker: { color: COLORS.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  unitBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  unitBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 15 },
  unitBtnTextActive: { color: COLORS.background },
  slash: { color: COLORS.textMuted, fontSize: 22 },
  textArea: { height: 100, paddingTop: 12 },
  saveBtn: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md + 2,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '700',
  },
});
