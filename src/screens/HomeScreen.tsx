import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { getStats } from '../db/database';

interface StatCardProps {
  label: string;
  value: string;
  color?: string;
}

function StatCard({ label, value, color = COLORS.primary }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState({
    totalSessions: 0,
    bestScorePct: null as number | null,
    bestGroupMm: null as number | null,
    avgGroupMm: null as number | null,
  });

  useFocusEffect(
    useCallback(() => {
      getStats(db).then(setStats);
    }, [db])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Track your progress.</Text>
        <Text style={styles.heroSub}>
          Log sessions, measure groups, improve your rifle.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.grid}>
        <StatCard
          label="Sessions logged"
          value={String(stats.totalSessions)}
        />
        <StatCard
          label="Best score"
          value={
            stats.bestScorePct != null
              ? `${stats.bestScorePct.toFixed(1)}%`
              : '—'
          }
          color={COLORS.secondary}
        />
        <StatCard
          label="Best group"
          value={
            stats.bestGroupMm != null
              ? `${stats.bestGroupMm.toFixed(1)} mm`
              : '—'
          }
          color={COLORS.success}
        />
        <StatCard
          label="Avg group"
          value={
            stats.avgGroupMm != null
              ? `${stats.avgGroupMm.toFixed(1)} mm`
              : '—'
          }
          color={COLORS.textMuted}
        />
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Tip</Text>
        <Text style={styles.tipText}>
          After a session, open the detail view and log each group size in mm.
          The app will automatically compute MOA at your shooting distance.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  hero: { marginVertical: SPACING.lg },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  heroSub: { fontSize: 15, color: COLORS.textMuted, lineHeight: 22 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
    fontWeight: '500',
  },
  cardValue: { fontSize: 24, fontWeight: '700' },
  tipCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  tipText: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
});
