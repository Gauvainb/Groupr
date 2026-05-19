import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';

import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { getSessionsForChart } from '../db/database';
import { Session, Group } from '../types';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - SPACING.md * 4;

interface ChartPoint {
  label: string;
  scorePct?: number;
  avgGroupMm?: number;
}

const BASE_CHART_CONFIG = {
  backgroundGradientFrom: COLORS.card,
  backgroundGradientTo: COLORS.card,
  decimalPlaces: 1,
  labelColor: () => COLORS.textMuted,
  style: { borderRadius: RADIUS.md },
};

export default function AnalysisScreen() {
  const db = useSQLiteContext();
  const [points, setPoints] = useState<ChartPoint[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSessionsForChart(db, 15).then(
        (data: { session: Session; groups: Group[] }[]) => {
          const pts: ChartPoint[] = data.map(({ session, groups }) => {
            const avgGroup =
              groups.length > 0
                ? groups.reduce((a, g) => a + g.sizeMm, 0) / groups.length
                : undefined;
            const scorePct =
              session.score != null &&
              session.maxScore != null &&
              session.maxScore > 0
                ? (session.score / session.maxScore) * 100
                : undefined;
            return { label: session.date.slice(5), scorePct, avgGroupMm: avgGroup };
          });
          setPoints(pts);
        }
      );
    }, [db])
  );

  const scorePoints = points.filter((p) => p.scorePct != null);
  const groupPoints = points.filter((p) => p.avgGroupMm != null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {points.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptySub}>
            Log sessions and group measurements to see your trends here.
          </Text>
        </View>
      ) : null}

      {scorePoints.length >= 2 ? (
        <>
          <Text style={styles.sectionTitle}>Score Trend</Text>
          <View style={styles.chartCard}>
            <LineChart
              data={{
                labels: scorePoints.map((p) => p.label),
                datasets: [{ data: scorePoints.map((p) => p.scorePct!) }],
              }}
              width={CHART_W}
              height={200}
              yAxisSuffix="%"
              chartConfig={{
                ...BASE_CHART_CONFIG,
                color: (opacity = 1) => `rgba(88, 166, 255, ${opacity})`,
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: COLORS.secondary,
                },
              }}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
              fromZero={false}
            />
          </View>
        </>
      ) : scorePoints.length > 0 ? (
        <View style={styles.hintCard}>
          <Text style={styles.hintText}>
            Score trend will appear after 2+ sessions with a score.
          </Text>
        </View>
      ) : null}

      {groupPoints.length >= 2 ? (
        <>
          <Text style={styles.sectionTitle}>Average Group Size</Text>
          <View style={styles.chartCard}>
            <LineChart
              data={{
                labels: groupPoints.map((p) => p.label),
                datasets: [{ data: groupPoints.map((p) => p.avgGroupMm!) }],
              }}
              width={CHART_W}
              height={200}
              yAxisSuffix=" mm"
              chartConfig={{
                ...BASE_CHART_CONFIG,
                color: (opacity = 1) => `rgba(63, 185, 80, ${opacity})`,
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: COLORS.success,
                },
              }}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
            />
          </View>
          <View style={styles.legendCard}>
            <Text style={styles.legendText}>
              Lower is better. A downward trend means your groups are tightening.
            </Text>
          </View>
        </>
      ) : groupPoints.length > 0 ? (
        <View style={styles.hintCard}>
          <Text style={styles.hintText}>
            Group size trend will appear after logging groups in 2+ sessions.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 60 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    alignItems: 'center',
  },
  chart: { borderRadius: RADIUS.md },
  hintCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  hintText: { fontSize: 14, color: COLORS.textMuted },
  legendCard: {
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  legendText: { fontSize: 13, color: COLORS.textMuted },
  emptyState: { marginTop: 80, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  emptySub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.lg,
  },
});
