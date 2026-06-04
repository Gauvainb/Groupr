import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { TargetStore, SessionStore, GroupStore } from '../db/store';
import { Impact } from '../types';
import { C, card } from '../theme';

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

function toMoa(sizeMm: number, distM: number) {
  return (sizeMm / (distM * 0.02908)).toFixed(2);
}

function toMeters(d: number, unit: string) {
  return unit === 'yd' ? d * 0.9144 : d;
}

export default function TargetPinPage() {
  const { id, targetId } = useParams<{ id: string; targetId: string }>();
  const sessionId = Number(id);
  const target = TargetStore.getById(Number(targetId));
  const session = SessionStore.getById(sessionId);

  const [impacts, setImpacts] = useState<Impact[]>(target?.impacts ?? []);
  const [savedGroup, setSavedGroup] = useState(false);

  const commitImpacts = useCallback((next: Impact[]) => {
    setImpacts(next);
    setSavedGroup(false);
    TargetStore.updateImpacts(Number(targetId), next);
  }, [targetId]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    commitImpacts([...impacts, { x, y }]);
  };

  const removeImpact = (index: number) => {
    commitImpacts(impacts.filter((_, i) => i !== index));
  };

  const handleSaveGroup = () => {
    if (!session || !target || impacts.length < 2) return;
    const distM = toMeters(session.distance, session.distanceUnit);
    const gMm = calcGroup(impacts, target.widthMm, target.heightMm);
    GroupStore.add({
      sessionId,
      sizeMm: parseFloat(gMm.toFixed(1)),
      shotCount: impacts.length,
      label: target.label || 'From target photo',
    });
    setSavedGroup(true);
  };

  if (!target || !session) {
    return <Layout><div style={{ padding: 16, color: C.muted }}>Target not found.</div></Layout>;
  }

  const distM = toMeters(session.distance, session.distanceUnit);
  const groupMm = impacts.length >= 2 ? calcGroup(impacts, target.widthMm, target.heightMm) : null;

  const cx = impacts.length > 0 ? impacts.reduce((s, i) => s + i.x, 0) / impacts.length : null;
  const cy = impacts.length > 0 ? impacts.reduce((s, i) => s + i.y, 0) / impacts.length : null;
  const meanRadius = impacts.length >= 2 && cx !== null && cy !== null
    ? impacts.reduce((s, imp) => {
        const dx = (imp.x - cx) * target.widthMm;
        const dy = (imp.y - cy) * target.heightMm;
        return s + Math.sqrt(dx * dx + dy * dy);
      }, 0) / impacts.length
    : null;

  return (
    <Layout>
      <div style={{
        padding: '8px 16px', background: C.card, borderBottom: `1px solid ${C.border}`,
        fontSize: 12, color: C.muted,
      }}>
        Tap the image to mark each bullet hole · Tap a marker to remove it
      </div>

      {/* Interactive target */}
      <div
        onClick={handleImageClick}
        onContextMenu={e => e.preventDefault()}
        style={{ position: 'relative', cursor: 'crosshair', userSelect: 'none', background: '#000' }}
      >
        <img
          src={target.imageData}
          style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
          draggable={false}
        />

        {/* Centre of impact */}
        {cx !== null && cy !== null && impacts.length >= 2 && (
          <div style={{
            position: 'absolute',
            left: `${cx * 100}%`,
            top: `${cy * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 14, height: 14, borderRadius: 7,
            background: C.primary,
            border: '2px solid white',
            pointerEvents: 'none',
            zIndex: 1,
            boxShadow: '0 0 6px rgba(0,0,0,0.9)',
          }} />
        )}

        {/* Impact markers */}
        {impacts.map((imp, i) => (
          <div
            key={i}
            onClick={e => { e.stopPropagation(); removeImpact(i); }}
            style={{
              position: 'absolute',
              left: `${imp.x * 100}%`,
              top: `${imp.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 28, height: 28, borderRadius: 14,
              background: C.danger,
              border: '2.5px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: 'white',
              cursor: 'pointer',
              zIndex: 2,
              boxShadow: '0 0 8px rgba(0,0,0,0.9)',
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Results panel */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {impacts.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: 12 }}>
            No impacts pinned yet — tap the image above to mark each bullet hole.
          </div>
        )}
        {impacts.length === 1 && (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 13 }}>
            Pin at least 2 impacts to calculate group size.
          </div>
        )}

        {groupMm !== null && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ ...card, flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Group (ES)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.success }}>{groupMm.toFixed(1)} mm</div>
            </div>
            <div style={{ ...card, flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>MOA</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{toMoa(groupMm, distM)}</div>
            </div>
            {meanRadius !== null && (
              <div style={{ ...card, flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Mean R</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.secondary }}>{meanRadius.toFixed(1)} mm</div>
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 11, color: C.muted }}>
          {impacts.length} impact{impacts.length !== 1 ? 's' : ''}
          {target.label && ` · ${target.label}`}
          {' · '}Target {target.widthMm}×{target.heightMm} mm
          {' · '}{session.distance} {session.distanceUnit}
          {' · '}
          <span style={{ color: C.primary }}>● COI</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => impacts.length > 0 && commitImpacts(impacts.slice(0, -1))}
            disabled={impacts.length === 0}
            style={{
              flex: 1, padding: 12, borderRadius: 8,
              background: C.card, border: `1px solid ${C.border}`,
              color: impacts.length === 0 ? C.muted : C.text,
              cursor: impacts.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >↩ Undo</button>
          <button
            onClick={() => impacts.length > 0 && confirm('Clear all impacts?') && commitImpacts([])}
            disabled={impacts.length === 0}
            style={{
              flex: 1, padding: 12, borderRadius: 8,
              background: C.card, border: `1px solid ${C.border}`,
              color: impacts.length === 0 ? C.muted : C.danger,
              cursor: impacts.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >Clear all</button>
        </div>

        <button
          onClick={handleSaveGroup}
          disabled={impacts.length < 2 || savedGroup}
          style={{
            width: '100%', padding: 14, borderRadius: 10, border: 'none',
            background: savedGroup ? C.success : impacts.length < 2 ? C.border : C.primary,
            color: impacts.length < 2 && !savedGroup ? C.muted : C.bg,
            fontSize: 15, fontWeight: 700,
            cursor: impacts.length < 2 || savedGroup ? 'not-allowed' : 'pointer',
          }}
        >
          {savedGroup ? '✓ Saved to session groups' : '+ Save Group to Session'}
        </button>
      </div>
    </Layout>
  );
}
