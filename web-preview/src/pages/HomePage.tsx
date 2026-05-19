import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getStats } from '../db/store';
import { C, card } from '../theme';

function StatCard({ label, value, color = C.primary }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, flex: '1 1 45%' }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default function HomePage() {
  const [stats, setStats] = useState(getStats());
  useEffect(() => {
    const refresh = () => setStats(getStats());
    window.addEventListener('store:update', refresh);
    return () => window.removeEventListener('store:update', refresh);
  }, []);

  return (
    <Layout title="Groupr">
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ paddingTop: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>
            Track your progress.
          </div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
            Log sessions, measure groups, improve your rifle.
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Overview
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <StatCard label="Sessions logged" value={String(stats.totalSessions)} />
            <StatCard label="Best score" value={stats.bestScorePct != null ? `${stats.bestScorePct.toFixed(1)}%` : '—'} color={C.secondary} />
            <StatCard label="Best group" value={stats.bestGroupMm != null ? `${stats.bestGroupMm.toFixed(1)} mm` : '—'} color={C.success} />
            <StatCard label="Avg group" value={stats.avgGroupMm != null ? `${stats.avgGroupMm.toFixed(1)} mm` : '—'} color={C.muted} />
          </div>
        </div>

        <div style={{ ...card, borderLeftWidth: 3, borderLeftColor: C.primary, borderLeftStyle: 'solid' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Tip</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            After a session, open the detail view and log each group size in mm. MOA is calculated automatically at your shooting distance.
          </div>
        </div>
      </div>
    </Layout>
  );
}
