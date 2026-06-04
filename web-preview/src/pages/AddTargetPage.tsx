import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { TargetStore } from '../db/store';
import { C } from '../theme';

const field: React.CSSProperties = {
  display: 'block', width: '100%',
  background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
  color: C.text, padding: '11px 14px', fontSize: 15, outline: 'none',
};
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: C.muted,
  textTransform: 'uppercase', letterSpacing: 0.5,
  display: 'block', marginBottom: 5, marginTop: 16,
};

interface Preset { label: string; desc: string; w: number; h: number }
const PRESET_GROUPS: { group: string; items: Preset[] }[] = [
  {
    group: '10 m',
    items: [
      { label: 'ISSF 10m Air Rifle',       desc: 'Carabine air 10m (ISSF)',        w: 170, h: 170 },
      { label: 'ISSF 10m Air Pistol',       desc: 'Pistolet air 10m (ISSF)',        w: 170, h: 170 },
    ],
  },
  {
    group: '25 m',
    items: [
      { label: 'ISSF 25m Pistol Precision', desc: 'Pistolet CF précision (ISSF)',   w: 170, h: 170 },
      { label: 'ISSF 25m Rapid-Fire',       desc: '5 silhouettes côte-à-côte',      w: 550, h: 550 },
    ],
  },
  {
    group: '50 m',
    items: [
      { label: 'ISSF 50m Rifle',            desc: 'Couché / 3 positions (ISSF)',    w: 550, h: 550 },
      { label: 'C50 — FFTir',               desc: '.22 LR 50m compétition France',  w: 510, h: 520 },
      { label: 'KK50 — DSB',               desc: '.22 LR 50m Kleinkaliber (feuille)', w: 340, h: 340 },
    ],
  },
  {
    group: '300 m',
    items: [
      { label: 'ISSF 300m Free Rifle',      desc: 'Carabine libre 300m (ISSF)',     w: 1020, h: 1020 },
    ],
  },
  {
    group: 'Pratique / IPSC',
    items: [
      { label: 'IPSC Classic',              desc: 'Carton classique (~18×23 in)',   w: 460, h: 580 },
      { label: 'IPSC Metric / USPSA',       desc: 'Carton métrique standard',       w: 460, h: 760 },
    ],
  },
  {
    group: 'Autres',
    items: [
      { label: 'NRA B-8 (25 yd)',           desc: 'Pistolet bullseye US 25 verges', w: 533, h: 610 },
      { label: 'Biathlon (panneau 5 disques)', desc: 'Panel IBU : couché 45 mm / debout 115 mm', w: 1200, h: 320 },
      { label: '.22 Hunter',                desc: 'Entraînement chasse / loisir',   w: 216, h: 279 },
    ],
  },
];

async function resizeImage(file: File, maxDim = 1200): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = url;
  });
}

export default function AddTargetPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [widthMm, setWidthMm] = useState('210');
  const [heightMm, setHeightMm] = useState('297');
  const [targetLabel, setTargetLabel] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const data = await resizeImage(file);
    setImageData(data);
    setLoading(false);
  };

  const handleSave = () => {
    if (!imageData) { alert('Please upload a target photo first.'); return; }
    const w = parseFloat(widthMm);
    const h = parseFloat(heightMm);
    if (!w || w <= 0 || !h || h <= 0) { alert('Enter valid target dimensions.'); return; }
    const target = TargetStore.add({
      sessionId, imageData, widthMm: w, heightMm: h,
      impacts: [], label: targetLabel || undefined,
    });
    navigate(`/sessions/${sessionId}/target/${target.id}`, { replace: true });
  };

  return (
    <Layout>
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 4 }}>
          Specify the physical size of the target paper before uploading. The app uses these dimensions
          to convert pixel distances into real-world millimetres for group &amp; MOA calculation.
        </div>

        <span style={label}>Physical Width (mm) *</span>
        <input type="number" value={widthMm} onChange={e => setWidthMm(e.target.value)}
          style={field} placeholder="210" />

        <span style={label}>Physical Height (mm) *</span>
        <input type="number" value={heightMm} onChange={e => setHeightMm(e.target.value)}
          style={field} placeholder="297" />

        <span style={label}>Standard targets</span>
        {PRESET_GROUPS.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
              letterSpacing: 1, marginBottom: 4 }}>{group}</div>
            {items.map(p => {
              const active = widthMm === String(p.w) && heightMm === String(p.h);
              return (
                <button key={p.label}
                  onClick={() => { setWidthMm(String(p.w)); setHeightMm(String(p.h)); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '10px 14px', marginBottom: 4, borderRadius: 8,
                    cursor: 'pointer', textAlign: 'left',
                    background: active ? C.primary : C.card,
                    border: `1px solid ${active ? C.primary : C.border}`,
                    color: active ? C.bg : C.text,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: active ? C.bg : C.muted, marginTop: 1 }}>{p.desc}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? C.bg : C.secondary,
                    flexShrink: 0, marginLeft: 12 }}>
                    {p.w}×{p.h} mm
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        <span style={label}>Label (optional)</span>
        <input type="text" value={targetLabel} onChange={e => setTargetLabel(e.target.value)}
          style={field} placeholder="e.g. Sighters, 1st string, 100 m…" />

        <span style={label}>Target Photo *</span>
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          onChange={handleFile} style={{ display: 'none' }} />

        {imageData ? (
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <img src={imageData} style={{ width: '100%', borderRadius: 8, display: 'block' }} />
            <button onClick={() => fileRef.current?.click()} style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.72)', border: 'none', borderRadius: 6,
              color: C.text, padding: '6px 10px', cursor: 'pointer', fontSize: 12,
            }}>Change</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} style={{
            width: '100%', padding: 28, borderRadius: 12,
            border: `2px dashed ${C.border}`, background: 'none',
            cursor: 'pointer', color: C.muted,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            {loading
              ? <span style={{ fontSize: 14 }}>Processing…</span>
              : <><span style={{ fontSize: 36 }}>📷</span><span style={{ fontSize: 14 }}>Tap to upload or take a photo</span></>
            }
          </button>
        )}

        <button onClick={handleSave} disabled={!imageData || loading} style={{
          marginTop: 20, width: '100%', padding: 15, borderRadius: 12,
          background: !imageData || loading ? C.border : C.primary,
          border: 'none',
          color: !imageData || loading ? C.muted : C.bg,
          fontSize: 16, fontWeight: 700,
          cursor: !imageData || loading ? 'not-allowed' : 'pointer',
        }}>
          Continue — Pin Impacts →
        </button>
      </div>
    </Layout>
  );
}
