import { Equipment, Session, Group } from '../types';

function read<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function write<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('store:update', { detail: key }));
}
function nextId(items: { id: number }[]) {
  return items.length === 0 ? 1 : Math.max(...items.map(i => i.id)) + 1;
}

export const EquipmentStore = {
  getAll(): Equipment[] { return read<Equipment>('eq').sort((a, b) => a.name.localeCompare(b.name)); },
  add(eq: Omit<Equipment, 'id' | 'createdAt'>): Equipment {
    const all = read<Equipment>('eq');
    const item: Equipment = { ...eq, id: nextId(all), createdAt: new Date().toISOString() };
    write('eq', [...all, item]);
    return item;
  },
  remove(id: number) { write('eq', read<Equipment>('eq').filter(e => e.id !== id)); },
};

export const SessionStore = {
  getAll(): Session[] { return read<Session>('sessions').sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)); },
  getById(id: number): Session | undefined { return this.getAll().find(s => s.id === id); },
  add(s: Omit<Session, 'id' | 'createdAt'>): Session {
    const all = read<Session>('sessions');
    const item: Session = { ...s, id: nextId(all), createdAt: new Date().toISOString() };
    write('sessions', [...all, item]);
    return item;
  },
  remove(id: number) {
    write('sessions', read<Session>('sessions').filter(s => s.id !== id));
    GroupStore.removeBySession(id);
  },
};

export const GroupStore = {
  getBySession(sessionId: number): Group[] { return read<Group>('groups').filter(g => g.sessionId === sessionId); },
  getAll(): Group[] { return read<Group>('groups'); },
  add(g: Omit<Group, 'id'>): Group {
    const all = read<Group>('groups');
    const item: Group = { ...g, id: nextId(all) };
    write('groups', [...all, item]);
    return item;
  },
  remove(id: number) { write('groups', read<Group>('groups').filter(g => g.id !== id)); },
  removeBySession(sessionId: number) { write('groups', read<Group>('groups').filter(g => g.sessionId !== sessionId)); },
};

export function getStats() {
  const sessions = SessionStore.getAll();
  const groups = GroupStore.getAll();
  const scored = sessions.filter(s => s.score != null && s.maxScore != null && s.maxScore > 0);
  const bestScore = scored.length > 0 ? Math.max(...scored.map(s => (s.score! / s.maxScore!) * 100)) : null;
  const sizes = groups.map(g => g.sizeMm);
  return {
    totalSessions: sessions.length,
    bestScorePct: bestScore,
    bestGroupMm: sizes.length > 0 ? Math.min(...sizes) : null,
    avgGroupMm: sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : null,
  };
}

export function getChartData(limit = 20) {
  const sessions = SessionStore.getAll().slice(-limit).reverse();
  return sessions.map(s => {
    const groups = GroupStore.getBySession(s.id);
    const avgGroup = groups.length > 0 ? groups.reduce((a, g) => a + g.sizeMm, 0) / groups.length : null;
    const scorePct = s.score != null && s.maxScore && s.maxScore > 0 ? (s.score / s.maxScore) * 100 : null;
    return { label: s.date.slice(5), scorePct, avgGroupMm: avgGroup };
  });
}
