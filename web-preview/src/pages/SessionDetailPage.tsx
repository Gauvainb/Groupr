import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { SessionStore, EquipmentStore, GroupStore, TargetStore } from '../db/store';
import { Session, Equipment, Group, TargetImage, Impact } from '../types';
import { C, card } from '../theme';

function toMoa(sizeMm: number, distM: number) {
  return (sizeMm / (distM * 0.02908)).toFixed(2);
}
function toMeters(d: number, unit: string) {
  return unit === 'yd' ? d * 0.9144 : d;
}
function calcGroup(impacts: Impact[], wMm: number, hMm: number): number {
  let max = 0;
  for (let i = 0; i < impacts.length; i++)
    for (let j = i + 1; j < impacts.length; j++) {
      const dx = (impacts[i].x - impacts[j].x) * wMm;
      const dy = (impacts[i].y - impacts[j].y) * hMm;
      max = Math.max(max, Math.sqrt(dx * dx + dy * dy));
    }
  return max;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.muted, flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function StatBadge({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ ...card, flex: 1, textAlign: 'center', padding: '12px 8px' }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: C.muted,
  textTransform: 'uppercase', letterSpacing: 1,
  margin: '18px 0 8px',
};
const inputStyle: React.CSSProperties = {
  background: C.cardAlt, border: `1px solid ${C.border}`,
  borderRadius: 6, color: C.text, padding: '9px 12px',
  fontSize: 14, outline: 'none', width: '100%',
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sessionId = Number(id);
  const [session, setSession] = useState<Session | undefined>();
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [targets, setTargets] = useState<TargetImage[]>([]);
  const [sizeMm, setSizeMm] = useState('');
  const [shotCount, setShotCount] = useState('5');
  const [groupLabel, setGroupLabel] = useState('');

  const reload = () => {
    const s = SessionStore.getById(sessionId);
    setSession(s);
    setGroups(GroupStore.getBySession(sessionId));
    setTargets(TargetStore.getBySession(sessionId));
    if (s?.equipmentId) setEquipment(EquipmentStore.getAll().find(e => e.id === s.equipmentId));
  };

  useEffect(() => { reload(); }, [sessionId]);

  const handleAddGroup = () => {
    const size = parseFloat(sizeMm);
    const shots = parseInt(shotCount, 10);
    if (isNaN(size) || size <= 0) { alert('Enter a valid group size in mm.'); return; }
    GroupStore.add({ sessionId, sizeMm: size, shotCount: isNaN(shots) ? 5 : shots, label: groupLabel || undefined });
    setSizeMm(''); setGroupLabel('');
    reload();
  };

  const handleDeleteGroup = (g: Group) => {
    if (confirm(`Remove group ${g.sizeMm.toFixed(1)} mm?`)) { GroupStore.remove(g.id); reload(); }
  };

  const handleDeleteTarget = (t: TargetImage) => {
    if (confirm('Delete this target photo and all pinned impacts?')) { TargetStore.remove(t.id); reload(); }
  };

  if (!session) return <Layout><div style={{ padding: 16, color: C.muted }}>Session not found.</div></Layout>;

  const distM = toMeters(session.distance, session.distanceUnit);
  const sizes = groups.map(g => g.sizeMm);
  const avgGroup = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : null;
  const bestGroup = sizes.length > 0 ? Math.min(...sizes) : null;

  return (
    <Layout>
      <div style={{ padding: 16, paddingBottom: 32 }}>
        {/* Session info */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0 16px' }}>
          <Row label="Date" value={new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
          <Row label="Discipline" value={session.discipline} />
          <Row label="Distance" value={`${session.distance} ${session.distanceUnit}`} />
          <Row label="Shots" value={String(session.shots)} />
          {session.score != null && session.maxScore != null && (
            <Row label="Score" value={`${session.score} / ${session.maxScore}  (${((session.score / session.maxScore) * 100).toFixed(1)}%)`} />
          )}
          {equipment && <Row label="Firearm" value={`${equipment.name} · ${equipment.caliber}`} />}
          {session.ammoDescription && <Row label="Ammo" value={session.ammoDescription} />}
          {session.notes && <Row label="Notes" value={session.notes} />}
        </div>

        {/* Group summary */}
        {groups.length > 0 && (
          <>
            <div style={sectionTitle}>Group Analysis</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <StatBadge label="Best" value={`${bestGroup!.toFixed(1)} mm`} sub={`${toMoa(bestGroup!, distM)} MOA`} color={C.success} />
              <StatBadge label="Average" value={`${avgGroup!.toFixed(1)} mm`} sub={`${toMoa(avgGroup!, distM)} MOA`} color={C.primary} />
              <StatBadge label="Groups" value={String(groups.length)} color={C.secondary} />
            </div>
          </>
        )}

        {/* Target Photos */}
        <div style={sectionTitle}>Target Photos</div>
        {targets.length === 0 && (
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
            Upload a photo of your target to pin bullet holes and get automatic group &amp; MOA calculation.
          </div>
        )}
        {targets.map(t => {
          const gMm = t.impacts.length >= 2 ? calcGroup(t.impacts, t.widthMm, t.heightMm) : null;
          return (
            <div key={t.id} onClick={() => navigate(`/sessions/${sessionId}/target/${t.id}`)} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
              marginBottom: 8, display: 'flex', gap: 12, padding: 10,
              cursor: 'pointer', alignItems: 'center',
            }}>
              <img src={t.imageData} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {t.label && <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{t.label}</div>}
                <div style={{ fontSize: 13, color: C.text }}>{t.impacts.length} impact{t.impacts.length !== 1 ? 's' : ''} pinned</div>
                {gMm !== null && (
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.success }}>
                    {gMm.toFixed(1)} mm
                    <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>{toMoa(gMm, distM)} MOA</span>
                  </div>
                )}
                {t.impacts.length < 2 && (
                  <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Tap to pin impacts</div>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); handleDeleteTarget(t); }} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: C.danger, fontSize: 16, flexShrink: 0,
              }}>🗑</button>
            </div>
          );
        })}
        <button onClick={() => navigate(`/sessions/${sessionId}/target/new`)} style={{
          width: '100%', padding: 11, borderRadius: 8, marginBottom: 16,
          background: C.card, border: `1px dashed ${C.border}`,
          color: C.secondary, cursor: 'pointer', fontSize: 14, fontWeight: 600,
        }}>+ Add Target Photo</button>

        {/* Groups list */}
        <div style={sectionTitle}>Groups</div>
        {groups.length === 0 && (
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>No groups logged yet — add one below.</div>
        )}
        {groups.map((g, i) => (
          <div key={g.id} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>#{i + 1}{g.label ? `  ·  ${g.label}` : ''}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{g.sizeMm.toFixed(1)} mm</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{toMoa(g.sizeMm, distM)} MOA · {g.shotCount} shots</div>
            </div>
            <button onClick={() => handleDeleteGroup(g)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: C.danger, fontSize: 16,
            }}>🗑</button>
          </div>
        ))}

        {/* Add group form */}
        <div style={sectionTitle}>Add Group</div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Size (mm) *</div>
          <input type="number" step="0.1" value={sizeMm} onChange={e => setSizeMm(e.target.value)}
            style={{ ...inputStyle, marginBottom: 10 }} placeholder="e.g. 18.5" />
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Shots in group</div>
              <input type="number" value={shotCount} onChange={e => setShotCount(e.target.value)} style={inputStyle} placeholder="5" />
            </div>
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Label (optional)</div>
              <input type="text" value={groupLabel} onChange={e => setGroupLabel(e.target.value)}
                style={inputStyle} placeholder="Sighter, Match…" />
            </div>
          </div>
          <button onClick={handleAddGroup} style={{
            width: '100%', padding: 12, borderRadius: 8,
            background: C.primary, border: 'none', color: C.bg,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>+ Add Group</button>
        </div>
      </div>
    </Layout>
  );
}
