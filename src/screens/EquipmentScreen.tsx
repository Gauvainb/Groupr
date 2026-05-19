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
import { getEquipment, deleteEquipment } from '../db/database';
import { Equipment } from '../types';
import { EquipmentStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<EquipmentStackParamList>;

export default function EquipmentScreen() {
  const db = useSQLiteContext();
  const nav = useNavigation<Nav>();
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  useFocusEffect(
    useCallback(() => {
      getEquipment(db).then(setEquipment);
    }, [db])
  );

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Remove Equipment', `Remove "${name}" from your rack?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteEquipment(db, id);
          setEquipment((e) => e.filter((x) => x.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={equipment}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="construct-outline"
              size={52}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>No firearms yet</Text>
            <Text style={styles.emptySub}>Tap + to add a firearm to your rack</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.type}  ·  {item.caliber}
              </Text>
              {item.optic ? (
                <Text style={styles.itemSub}>Optic: {item.optic}</Text>
              ) : null}
              {item.notes ? (
                <Text style={styles.itemNotes} numberOfLines={1}>
                  {item.notes}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.name)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => nav.navigate('AddEquipment', {})}
      >
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
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  itemMeta: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  itemSub: { fontSize: 12, color: COLORS.secondary, marginTop: 3 },
  itemNotes: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
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
