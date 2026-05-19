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

const PRESETS = [
  { label: 'A4 (210×297)', w: 210, h: 297 },
  { label: 'Letter (216×279)', w: 216, h: 279 },
  { label: '30×30 cm', w: 300, h: 300 },
  { label: '50×50 cm', w: 500, h: 500 },
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

        <span style={label}>Quick presets</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setWidthMm(String(p.w)); setHeightMm(String(p.h)); }}
              style={{
                padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${widthMm === String(p.w) && heightMm === String(p.h) ? C.primary : C.border}`,
                background: widthMm === String(p.w) && heightMm === String(p.h) ? C.primary : C.card,
                color: widthMm === String(p.w) && heightMm === String(p.h) ? C.bg : C.text,
              }}
            >{p.label}</button>
          ))}
        </div>

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
