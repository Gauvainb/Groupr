import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { SessionStore } from '../db/store';
import { Session } from '../types';
import { C } from '../theme';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>(SessionStore.getAll());

  useEffect(() => {
    const refresh = () => setSessions(SessionStore.getAll());
    window.addEventListener('store:update', refresh);
    return () => window.removeEventListener('store:update', refresh);
  }, []);

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Delete this session and all its group data?')) {
      SessionStore.remove(id);
    }
  };

  return (
    <Layout>
      <div style={{ padding: '12px 16px', paddingBottom: 80 }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 80, color: C.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 6 }}>No sessions yet</div>
            <div style={{ fontSize: 14 }}>Tap + to log your first session</div>
          </div>
        ) : sessions.map(s => (
          <div key={s.id} onClick={() => navigate(`/sessions/${s.id}`)} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
            marginBottom: 10, display: 'flex', alignItems: 'stretch',
            cursor: 'pointer', overflow: 'hidden',
          }}>
            <div style={{ width: 3, background: C.primary, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(s.date)}</span>
                {s.score != null && s.maxScore != null && s.maxScore > 0 && (
                  <span style={{ fontSize: 17, fontWeight: 700, color: C.primary }}>
                    {((s.score / s.maxScore) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{s.discipline}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
                {s.distance} {s.distanceUnit} · {s.shots} shots
              </div>
            </div>
            <button onClick={e => handleDelete(e, s.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 14px',
              color: C.danger, fontSize: 16,
            }}>🗑</button>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button onClick={() => navigate('/sessions/new')} style={{
        position: 'fixed', bottom: 76, right: 'calc(50% - 215px + 16px)',
        width: 54, height: 54, borderRadius: 27, background: C.primary,
        border: 'none', cursor: 'pointer', fontSize: 28, color: C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 16px ${C.primary}55`, zIndex: 15,
      }}>+</button>
    </Layout>
  );
}
