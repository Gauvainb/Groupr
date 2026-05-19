import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { getSessions, deleteSession } from '../db/database';
import { Session } from '../types';
import { SessionsStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<SessionsStackParamList>;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function SessionsScreen() {
  const db = useSQLiteContext();
  const nav = useNavigation<Nav>();
  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSessions(db).then(setSessions);
    }, [db])
  );

  const handleDelete = (id: number) => {
    Alert.alert('Delete Session', 'This will also remove all group data for this session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(db, id);
          setSessions((s) => s.filter((x) => x.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="aperture-outline" size={52} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptySub}>Tap + to log your first session</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => nav.navigate('SessionDetail', { sessionId: item.id })}
          >
            <View style={styles.itemAccent} />
            <View style={styles.itemBody}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
                {item.score != null && item.maxScore != null && item.maxScore > 0 && (
                  <Text style={styles.itemScore}>
                    {((item.score / item.maxScore) * 100).toFixed(1)}%
                  </Text>
                )}
              </View>
              <Text style={styles.itemDiscipline}>{item.discipline}</Text>
              <Text style={styles.itemMeta}>
                {item.distance} {item.distanceUnit} · {item.shots} shots
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('AddSession', {})}>
        <Ionicons name="add" size={30} color={COLORS.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.md, paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textMuted },
  item: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  itemAccent: { width: 3, alignSelf: 'stretch', backgroundColor: COLORS.primary },
  itemBody: { flex: 1, padding: SPACING.md },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemDate: { fontSize: 12, color: COLORS.textMuted },
  itemScore: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  itemDiscipline: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  itemMeta: { fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  deleteBtn: { paddingHorizontal: SPACING.md },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
