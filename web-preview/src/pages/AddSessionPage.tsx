import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { SessionStore, EquipmentStore } from '../db/store';
import { DISCIPLINES, EQUIPMENT_TYPES, Equipment } from '../types';
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

export default function AddSessionPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const [distance, setDistance] = useState('100');
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'yd'>('m');
  const [shots, setShots] = useState('10');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [ammo, setAmmo] = useState('');
  const [notes, setNotes] = useState('');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [eqId, setEqId] = useState('');

  useEffect(() => { setEquipment(EquipmentStore.getAll()); }, []);

  const handleSave = () => {
    const dist = parseFloat(distance);
    const sh = parseInt(shots, 10);
    if (!dist || dist <= 0) { alert('Enter a valid distance.'); return; }
    if (!sh || sh <= 0) { alert('Enter a valid shot count.'); return; }
    const session = SessionStore.add({
      date, discipline, distance: dist, distanceUnit,
      equipmentId: eqId ? Number(eqId) : undefined,
      shots: sh,
      score: score ? parseFloat(score) : undefined,
      maxScore: maxScore ? parseFloat(maxScore) : undefined,
      ammoDescription: ammo || undefined,
      notes: notes || undefined,
    });
    navigate(`/sessions/${session.id}`, { replace: true });
  };

  const unitBtn = (u: 'm' | 'yd'): React.CSSProperties => ({
    padding: '11px 18px', borderRadius: 6, border: `1px solid ${C.border}`,
    cursor: 'pointer', fontWeight: 600, fontSize: 15,
    background: distanceUnit === u ? C.primary : C.card,
    color: distanceUnit === u ? C.bg : C.muted,
  });

  return (
    <Layout>
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <span style={label}>Date</span>
        <input type="date" value={date} max={new Date().toISOString().split('T')[0]}
          onChange={e => setDate(e.target.value)} style={{ ...field, colorScheme: 'dark' }} />

        <span style={label}>Discipline</span>
        <select value={discipline} onChange={e => setDiscipline(e.target.value as typeof discipline)} style={field}>
          {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <span style={label}>Distance</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" value={distance} onChange={e => setDistance(e.target.value)}
            style={{ ...field, flex: 1 }} placeholder="100" />
          <button onClick={() => setDistanceUnit('m')} style={unitBtn('m')}>m</button>
          <button onClick={() => setDistanceUnit('yd')} style={unitBtn('yd')}>yd</button>
        </div>

        <span style={label}>Firearm (optional)</span>
        <select value={eqId} onChange={e => setEqId(e.target.value)} style={field}>
          <option value="">None</option>
          {equipment.map(e => <option key={e.id} value={e.id}>{e.name} · {e.caliber}</option>)}
        </select>

        <span style={label}>Number of shots</span>
        <input type="number" value={shots} onChange={e => setShots(e.target.value)}
          style={field} placeholder="10" />

        <span style={label}>Score (optional)</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="number" value={score} onChange={e => setScore(e.target.value)}
            style={{ ...field, flex: 1 }} placeholder="Score" />
          <span style={{ color: C.muted, fontSize: 20, flexShrink: 0 }}>/</span>
          <input type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)}
            style={{ ...field, flex: 1 }} placeholder="Max" />
        </div>

        <span style={label}>Ammunition (optional)</span>
        <input type="text" value={ammo} onChange={e => setAmmo(e.target.value)}
          style={field} placeholder="e.g. Federal GM 168gr BTHP · Lot #A42" />

        <span style={label}>Notes (optional)</span>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          style={{ ...field, height: 90, resize: 'vertical' }}
          placeholder="Wind, conditions, adjustments…" />

        <button onClick={handleSave} style={{
          marginTop: 28, width: '100%', padding: 15, borderRadius: 12,
          background: C.primary, border: 'none', color: C.bg,
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
        }}>Save Session</button>
      </div>
    </Layout>
  );
}
