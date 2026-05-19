import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';

import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { addEquipment } from '../db/database';
import { EQUIPMENT_TYPES, EquipmentType } from '../types';
import { EquipmentStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<EquipmentStackParamList>;

export default function AddEquipmentScreen() {
  const db = useSQLiteContext();
  const nav = useNavigation<Nav>();
  const [name, setName] = useState('');
  const [type, setType] = useState<EquipmentType>(EQUIPMENT_TYPES[0]);
  const [caliber, setCaliber] = useState('');
  const [optic, setOptic] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }
    if (!caliber.trim()) {
      Alert.alert('Validation', 'Caliber is required.');
      return;
    }
    await addEquipment(db, {
      name: name.trim(),
      type,
      caliber: caliber.trim(),
      optic: optic.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    nav.goBack();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Sako TRG-42"
        placeholderTextColor={COLORS.textMuted}
        autoFocus
      />

      <Text style={styles.label}>Type *</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={type}
          onValueChange={(v) => setType(v as EquipmentType)}
          style={styles.picker}
          dropdownIconColor={COLORS.textMuted}
        >
          {EQUIPMENT_TYPES.map((t) => (
            <Picker.Item key={t} label={t} value={t} color={COLORS.text} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Caliber *</Text>
      <TextInput
        style={styles.input}
        value={caliber}
        onChangeText={setCaliber}
        placeholder="e.g. .308 Win, 6.5 Creedmoor"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.label}>Optic (optional)</Text>
      <TextInput
        style={styles.input}
        value={optic}
        onChangeText={setOptic}
        placeholder="e.g. Nightforce ATACR 5-25×56"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Barrel length, trigger weight, stock, etc."
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Firearm</Text>
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
  pickerWrapper: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  picker: { color: COLORS.text },
  textArea: { height: 90, paddingTop: 12 },
  saveBtn: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md + 2,
    alignItems: 'center',
  },
  saveBtnText: { color: COLORS.background, fontSize: 17, fontWeight: '700' },
});
