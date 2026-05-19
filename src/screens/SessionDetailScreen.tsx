import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { getSessionWithDetails, addGroup, deleteGroup } from '../db/database';
import { SessionWithDetails, Group } from '../types';
import { SessionsStackParamList } from '../navigation/AppNavigator';

type Route = RouteProp<SessionsStackParamList, 'SessionDetail'>;

function distanceInMeters(distance: number, unit: string): number {
  return unit === 'yd' ? distance * 0.9144 : distance;
}

function toMoa(sizeMm: number, distM: number): string {
  // 1 MOA ≈ 29.08 mm at 100 m
  const moa = sizeMm / (distM * 0.02908);
  return moa.toFixed(2);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function StatBadge({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <View style={styles.statBadge}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function SessionDetailScreen() {
  const db = useSQLiteContext();
  const { sessionId } = useRoute<Route>().params;

  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [newGroupSize, setNewGroupSize] = useState('');
  const [newGroupShots, setNewGroupShots] = useState('5');
  const [newGroupLabel, setNewGroupLabel] = useState('');

  const load = useCallback(async () => {
    const s = await getSessionWithDetails(db, sessionId);
    setSession(s);
  }, [db, sessionId]);

  useFocusEffect(load);

  const handleAddGroup = async () => {
    const size = parseFloat(newGroupSize);
    const shots = parseInt(newGroupShots, 10);
    if (isNaN(size) || size <= 0) {
      Alert.alert('Validation', 'Enter a valid group size in mm.');
      return;
    }
    await addGroup(db, {
      sessionId,
      sizeMm: size,
      shotCount: isNaN(shots) || shots < 1 ? 5 : shots,
      label: newGroupLabel || undefined,
    });
    setNewGroupSize('');
    setNewGroupLabel('');
    await load();
  };

  const handleDeleteGroup = (g: Group) => {
    Alert.alert(
      'Delete Group',
      `Remove measurement ${g.sizeMm.toFixed(1)} mm?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGroup(db, g.id);
            await load();
          },
        },
      ]
    );
  };

  if (!session) return null;

  const distM = distanceInMeters(session.distance, session.distanceUnit);
  const avgGroup =
    session.groups.length > 0
      ? session.groups.reduce((a, g) => a + g.sizeMm, 0) / session.groups.length
      : null;
  const bestGroup =
    session.groups.length > 0
      ? Math.min(...session.groups.map((g) => g.sizeMm))
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Session info */}
      <View style={styles.card}>
        <Row
          label="Date"
          value={new Date(session.date).toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        />
        <Row label="Discipline" value={session.discipline} />
        <Row
          label="Distance"
          value={`${session.distance} ${session.distanceUnit}`}
        />
        <Row label="Shots" value={String(session.shots)} />
        {session.score != null && session.maxScore != null && (
          <Row
            label="Score"
            value={`${session.score} / ${session.maxScore}  (${(
              (session.score / session.maxScore) *
              100
            ).toFixed(1)}%)`}
          />
        )}
        {session.equipment ? (
          <Row
            label="Firearm"
            value={`${session.equipment.name}  ·  ${session.equipment.caliber}`}
          />
        ) : null}
        {session.ammoDescription ? (
          <Row label="Ammo" value={session.ammoDescription} />
        ) : null}
        {session.notes ? <Row label="Notes" value={session.notes} /> : null}
      </View>

      {/* Group summary */}
      {session.groups.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Group Analysis</Text>
          <View style={styles.statsRow}>
            <StatBadge
              label="Best"
              value={`${bestGroup!.toFixed(1)} mm`}
              sub={`${toMoa(bestGroup!, distM)} MOA`}
              color={COLORS.success}
            />
            <StatBadge
              label="Average"
              value={`${avgGroup!.toFixed(1)} mm`}
              sub={`${toMoa(avgGroup!, distM)} MOA`}
              color={COLORS.primary}
            />
            <StatBadge
              label="Groups"
              value={String(session.groups.length)}
              color={COLORS.secondary}
            />
          </View>
        </>
      )}

      {/* Groups list */}
      <Text style={styles.sectionTitle}>Groups</Text>
      {session.groups.length === 0 && (
        <Text style={styles.noGroups}>
          No groups logged yet. Add one below.
        </Text>
      )}
      {session.groups.map((g, i) => (
        <View key={g.id} style={styles.groupRow}>
          <View style={styles.groupLeft}>
            <Text style={styles.groupIndex}>
              #{i + 1}
              {g.label ? `  ·  ${g.label}` : ''}
            </Text>
            <Text style={styles.groupSize}>{g.sizeMm.toFixed(1)} mm</Text>
            <Text style={styles.groupMeta}>
              {toMoa(g.sizeMm, distM)} MOA · {g.shotCount} shots
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteGroup(g)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Add group form */}
      <Text style={styles.sectionTitle}>Add Group</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Size (mm) *</Text>
        <TextInput
          style={styles.input}
          value={newGroupSize}
          onChangeText={setNewGroupSize}
          keyboardType="decimal-pad"
          placeholder="e.g. 18.5"
          placeholderTextColor={COLORS.textMuted}
        />
        <Text style={styles.fieldLabel}>Shots in group</Text>
        <TextInput
          style={styles.input}
          value={newGroupShots}
          onChangeText={setNewGroupShots}
          keyboardType="number-pad"
          placeholder="5"
          placeholderTextColor={COLORS.textMuted}
        />
        <Text style={styles.fieldLabel}>Label (optional)</Text>
        <TextInput
          style={styles.input}
          value={newGroupLabel}
          onChangeText={setNewGroupLabel}
          placeholder="e.g. Sighter, Match, Cold bore"
          placeholderTextColor={COLORS.textMuted}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddGroup}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.background} />
          <Text style={styles.addBtnText}>Add Group</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 60 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowLabel: { fontSize: 14, color: COLORS.textMuted, flex: 1 },
  rowValue: {
    fontSize: 14,
    color: COLORS.text,
    flex: 2,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statBadge: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  noGroups: { fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.sm },
  groupRow: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupLeft: { flex: 1 },
  groupIndex: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  groupSize: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  groupMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
    marginTop: SPACING.sm,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  addBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 16 },
});
