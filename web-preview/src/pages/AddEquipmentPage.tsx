import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { EquipmentStore } from '../db/store';
import { EQUIPMENT_TYPES, EquipmentType } from '../types';
import { C } from '../theme';

const field: React.CSSProperties = {
  display: 'block', width: '100%',
  background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
  color: C.text, padding: '11px 14px', fontSize: 15, outline: 'none',
  appearance: 'none', WebkitAppearance: 'none',
};
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: C.muted,
  textTransform: 'uppercase', letterSpacing: 0.5,
  display: 'block', marginBottom: 5, marginTop: 16,
};

export default function AddEquipmentPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState<EquipmentType>('Rifle');
  const [caliber, setCaliber] = useState('');
  const [optic, setOptic] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!name.trim()) { alert('Name is required.'); return; }
    if (!caliber.trim()) { alert('Caliber is required.'); return; }
    EquipmentStore.add({ name: name.trim(), type, caliber: caliber.trim(), optic: optic.trim() || undefined, notes: notes.trim() || undefined });
    navigate('/equipment', { replace: true });
  };

  return (
    <Layout>
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <span style={label}>Name *</span>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          style={field} placeholder="e.g. Sako TRG-42" autoFocus />

        <span style={label}>Type *</span>
        <select value={type} onChange={e => setType(e.target.value as EquipmentType)} style={field}>
          {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <span style={label}>Caliber *</span>
        <input type="text" value={caliber} onChange={e => setCaliber(e.target.value)}
          style={field} placeholder="e.g. .308 Win, 6.5 Creedmoor" />

        <span style={label}>Optic (optional)</span>
        <input type="text" value={optic} onChange={e => setOptic(e.target.value)}
          style={field} placeholder="e.g. Nightforce ATACR 5-25×56" />

        <span style={label}>Notes (optional)</span>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          style={{ ...field, height: 80, resize: 'vertical' }}
          placeholder="Barrel length, trigger weight, stock…" />

        <button onClick={handleSave} style={{
          marginTop: 28, width: '100%', padding: 15, borderRadius: 12,
          background: C.primary, border: 'none', color: C.bg,
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
        }}>Save Firearm</button>
      </div>
    </Layout>
  );
}
