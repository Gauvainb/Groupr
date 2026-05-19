import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { EquipmentStore } from '../db/store';
import { Equipment } from '../types';
import { C } from '../theme';

export default function EquipmentPage() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>(EquipmentStore.getAll());

  useEffect(() => {
    const refresh = () => setEquipment(EquipmentStore.getAll());
    window.addEventListener('store:update', refresh);
    return () => window.removeEventListener('store:update', refresh);
  }, []);

  const handleDelete = (e: React.MouseEvent, eq: Equipment) => {
    e.stopPropagation();
    if (confirm(`Remove "${eq.name}" from your rack?`)) EquipmentStore.remove(eq.id);
  };

  return (
    <Layout>
      <div style={{ padding: '12px 16px', paddingBottom: 80 }}>
        {equipment.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 80, color: C.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚙</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 6 }}>No firearms yet</div>
            <div style={{ fontSize: 14 }}>Tap + to add a firearm to your rack</div>
          </div>
        ) : equipment.map(eq => (
          <div key={eq.id} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '12px 14px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 22,
              background: C.cardAlt, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>🎯</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{eq.name}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{eq.type} · {eq.caliber}</div>
              {eq.optic && <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{eq.optic}</div>}
              {eq.notes && (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {eq.notes}
                </div>
              )}
            </div>
            <button onClick={e => handleDelete(e, eq)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.danger, fontSize: 16, flexShrink: 0,
            }}>🗑</button>
          </div>
        ))}
      </div>

      <button onClick={() => navigate('/equipment/new')} style={{
        position: 'fixed', bottom: 76, right: 'calc(50% - 215px + 16px)',
        width: 54, height: 54, borderRadius: 27, background: C.primary,
        border: 'none', cursor: 'pointer', fontSize: 28, color: C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 16px ${C.primary}55`, zIndex: 15,
      }}>+</button>
    </Layout>
  );
}
