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
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: C.muted,
  textTransform: 'uppercase', letterSpacing: 0.5,
  display: 'block', marginBottom: 5, marginTop: 16,
};

// ─── Target kinds ──────────────────────────────────────────────────────────
type TgtKind =
  | 'air_rifle_10' | 'air_pistol_10'
  | 'pistol_25_prec' | 'rapid_fire_25'
  | 'rifle_50' | 'c50' | 'kk50'
  | 'rifle_300'
  | 'ipsc_classic' | 'ipsc_metric'
  | 'nra_b8' | 'biathlon' | 'hunter22';

interface Preset { kind: TgtKind; label: string; desc: string; w: number; h: number }

const PRESET_GROUPS: { group: string; items: Preset[] }[] = [
  { group: '10 m', items: [
    { kind: 'air_rifle_10',    label: 'ISSF 10m Air Rifle',          desc: 'Carabine à air 10m (ISSF)',           w: 170,  h: 170  },
    { kind: 'air_pistol_10',   label: 'ISSF 10m Air Pistol',         desc: 'Pistolet à air 10m (ISSF)',           w: 170,  h: 170  },
  ]},
  { group: '25 m', items: [
    { kind: 'pistol_25_prec',  label: 'ISSF 25m Pistol Precision',   desc: 'Pistolet CF précision (ISSF)',        w: 170,  h: 170  },
    { kind: 'rapid_fire_25',   label: 'ISSF 25m Rapid-Fire',         desc: '5 silhouettes côte-à-côte',           w: 550,  h: 550  },
  ]},
  { group: '50 m', items: [
    { kind: 'rifle_50',        label: 'ISSF 50m Rifle',              desc: 'Couché / 3 positions (ISSF)',         w: 550,  h: 550  },
    { kind: 'c50',             label: 'C50 — FFTir',                 desc: '.22 LR 50m compétition France',       w: 510,  h: 520  },
    { kind: 'kk50',            label: 'KK50 — DSB',                  desc: '.22 LR 50m Kleinkaliber (feuille)',   w: 340,  h: 340  },
  ]},
  { group: '300 m', items: [
    { kind: 'rifle_300',       label: 'ISSF 300m Free Rifle',        desc: 'Carabine libre 300m (ISSF)',          w: 1020, h: 1020 },
  ]},
  { group: 'Pratique / IPSC', items: [
    { kind: 'ipsc_classic',    label: 'IPSC Classic',                desc: 'Carton classique (~18×23 in)',         w: 460,  h: 580  },
    { kind: 'ipsc_metric',     label: 'IPSC Metric / USPSA',         desc: 'Carton métrique standard',            w: 460,  h: 760  },
  ]},
  { group: 'Autres', items: [
    { kind: 'nra_b8',          label: 'NRA B-8 (25 yd)',             desc: 'Pistolet bullseye US 25 verges',      w: 533,  h: 610  },
    { kind: 'biathlon',        label: 'Biathlon — panneau IBU',      desc: 'Couché 45 mm / debout 115 mm (×5)',   w: 1200, h: 320  },
    { kind: 'hunter22',        label: '.22 Hunter',                  desc: 'Entraînement chasse / loisir',        w: 216,  h: 279  },
  ]},
];

// ─── Placeholder generators ────────────────────────────────────────────────

function drawBullseye(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  { outerFrac, blackFrac, rings = 10 }: { outerFrac: number; blackFrac: number; rings?: number },
) {
  const cx = cw / 2, cy = ch / 2;
  const R = Math.min(cw, ch) / 2;
  const outerR = R * outerFrac;
  const blackR  = R * blackFrac;
  const bandW   = outerR / rings;
  const lw      = Math.max(0.5, R / 400);

  // Background
  ctx.fillStyle = '#F5F5EC';
  ctx.fillRect(0, 0, cw, ch);

  // Alternating rings, outermost first
  for (let i = rings; i >= 1; i--) {
    const r = outerR * i / rings;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const inBlack = r <= blackR + lw;
    ctx.fillStyle = inBlack
      ? (i % 2 === 0 ? '#111' : '#1c1c1c')
      : (i % 2 === 0 ? '#d4d4cc' : '#ebebE3');
    ctx.fill();
    ctx.strokeStyle = inBlack ? '#353535' : '#9999994d';
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  // Solid black inner zone with subtle sub-ring lines inside it
  if (blackR > R * 0.015) {
    ctx.beginPath();
    ctx.arc(cx, cy, blackR, 0, Math.PI * 2);
    ctx.fillStyle = '#090909';
    ctx.fill();
    for (let i = rings; i >= 1; i--) {
      const r = outerR * i / rings;
      if (r >= blackR - lw) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }

  // Centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(2, R * 0.007), 0, Math.PI * 2);
  ctx.fillStyle = blackR > R * 0.02 ? '#777' : '#aaa';
  ctx.fill();

  // Score numbers: font sized to fit the band, placed at 3 o'clock AND 9 o'clock
  const fs = Math.max(6, Math.min(bandW * 0.55, 14));
  ctx.font = `600 ${Math.round(fs)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = rings; i >= 1; i--) {
    const rOuter = outerR * i / rings;
    const rInner = outerR * (i - 1) / rings;
    const midR   = (rOuter + rInner) / 2;
    if (midR < bandW * 0.65) continue;
    const score   = rings - i + 1;
    const onBlack = rOuter <= blackR + bandW * 0.2;
    ctx.fillStyle = onBlack ? 'rgba(210,210,210,0.92)' : 'rgba(50,50,50,0.78)';
    ctx.fillText(String(score), cx + midR, cy);   // 3 o'clock
    ctx.fillText(String(score), cx - midR, cy);   // 9 o'clock
  }
}

function drawRapidFire(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  ctx.fillStyle = '#F3F3EB';
  ctx.fillRect(0, 0, cw, ch);

  const n = 5;
  const slot = cw / n;
  const figW = slot * 0.62;
  const margin = ch * 0.05;

  for (let i = 0; i < n; i++) {
    const cx = slot * (i + 0.5);
    const headR = figW * 0.29;
    const headCy = margin + headR * 1.15;

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
    ctx.fill();

    const bodyTop = headCy + headR * 0.65;
    const bodyH   = ch - bodyTop - margin;
    ctx.beginPath();
    ctx.roundRect(cx - figW / 2, bodyTop, figW, bodyH, figW * 0.1);
    ctx.fill();

    // 10-ring inside body
    const ringR  = figW * 0.22;
    const ringCy = bodyTop + bodyH * 0.32;
    ctx.beginPath();
    ctx.arc(cx, ringCy, ringR, 0, Math.PI * 2);
    ctx.fillStyle = '#3a3a3a';
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#111';
  }
}

function drawIPSC(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  ctx.fillStyle = '#DDD09A';
  ctx.fillRect(0, 0, cw, ch);

  const mg = cw * 0.06;
  const headR  = cw * 0.14;
  const headCx = cw / 2;
  const headCy = mg + headR * 1.1;

  ctx.fillStyle = '#C8B87A';
  ctx.strokeStyle = '#8B7340';
  ctx.lineWidth = cw * 0.004;

  ctx.beginPath();
  ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  const bLeft  = mg * 1.6;
  const bTop   = headCy + headR * 0.6;
  const bW     = cw - bLeft * 2;
  const bH     = ch - bTop - mg;
  ctx.beginPath();
  ctx.roundRect(bLeft, bTop, bW, bH, bW * 0.08);
  ctx.fill(); ctx.stroke();

  const azPx = bW * 0.18, azPy = bH * 0.12;
  ctx.beginPath();
  ctx.roundRect(bLeft + azPx, bTop + azPy, bW - azPx * 2, bH - azPy * 2, bW * 0.06);
  ctx.strokeStyle = '#8B7340';
  ctx.lineWidth = cw * 0.003;
  ctx.setLineDash([cw * 0.016, cw * 0.008]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#7a6530';
  ctx.font = `bold ${Math.round(cw * 0.07)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', cw / 2, bTop + bH * 0.44);
}

function drawBiathlon(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(0, 0, cw, ch);

  const n = 5;
  const slot  = cw / n;
  // Standing disc: 115 mm on 320 mm panel → 0.359 of height
  const discR = ch * 0.179;

  for (let i = 0; i < n; i++) {
    const cx = slot * (i + 0.5);
    ctx.beginPath();
    ctx.arc(cx, ch / 2, discR, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, ch / 2, discR * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = '#bbb';
    ctx.fill();
  }

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, cw - 2, ch - 2);
}

function generatePlaceholder(kind: TgtKind, wMm: number, hMm: number): string {
  const BASE = 720;
  const aspect = wMm / hMm;
  const cw = aspect >= 1 ? BASE : Math.round(BASE * aspect);
  const ch = aspect >= 1 ? Math.round(BASE / aspect) : BASE;

  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d')!;

  switch (kind) {
    case 'air_rifle_10':
    case 'air_pistol_10':
      // Black zone = rings 4-10, outer diam 30.5mm vs scoring outer 45.5mm → ratio 0.670
      drawBullseye(ctx, cw, ch, { outerFrac: 0.91, blackFrac: 0.61 }); break;
    case 'pistol_25_prec':
      // Similar large black zone to 10m pistol
      drawBullseye(ctx, cw, ch, { outerFrac: 0.91, blackFrac: 0.56 }); break;
    case 'rapid_fire_25':
      drawRapidFire(ctx, cw, ch); break;
    case 'rifle_50':
    case 'c50':
    case 'kk50':
      drawBullseye(ctx, cw, ch, { outerFrac: 0.91, blackFrac: 0.02 }); break;
    case 'rifle_300':
      drawBullseye(ctx, cw, ch, { outerFrac: 0.91, blackFrac: 0.049 }); break;
    case 'ipsc_classic':
    case 'ipsc_metric':
      drawIPSC(ctx, cw, ch); break;
    case 'biathlon':
      drawBiathlon(ctx, cw, ch); break;
    case 'nra_b8':
      // Black zone ≈ rings 5-10, ~5.5" diam on 10.5" card → ratio ~0.52
      drawBullseye(ctx, cw, ch, { outerFrac: 0.85, blackFrac: 0.44 }); break;
    case 'hunter22':
      drawBullseye(ctx, cw, ch, { outerFrac: 0.80, blackFrac: 0.10 }); break;
  }

  // Watermark
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.font = `${Math.round(Math.min(cw, ch) * 0.028)}px system-ui`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('placeholder · Groupr', cw - 6, ch - 4);

  return canvas.toDataURL('image/jpeg', 0.90);
}

// ─── Image resize helper ────────────────────────────────────────────────────

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

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AddTargetPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [widthMm, setWidthMm]       = useState('');
  const [heightMm, setHeightMm]     = useState('');
  const [selectedKind, setKind]     = useState<TgtKind | null>(null);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [targetLabel, setLabel]     = useState('');
  const [imageData, setImageData]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  const selectPreset = (p: Preset) => {
    setWidthMm(String(p.w));
    setHeightMm(String(p.h));
    setKind(p.kind);
    // auto-generate placeholder (replaces existing placeholder, not a real photo)
    if (!imageData || isPlaceholder) {
      setImageData(generatePlaceholder(p.kind, p.w, p.h));
      setIsPlaceholder(true);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const data = await resizeImage(file);
    setImageData(data);
    setIsPlaceholder(false);
    setLoading(false);
  };

  const handleSave = () => {
    if (!imageData) { alert('Sélectionne une cible ou upload une photo.'); return; }
    const w = parseFloat(widthMm);
    const h = parseFloat(heightMm);
    if (!w || w <= 0 || !h || h <= 0) { alert('Dimensions invalides.'); return; }
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
          Sélectionne le type de cible pour auto-générer un gabarit, ou upload ta propre photo.
          Les dimensions sont utilisées pour calculer les groupements et la MOA.
        </div>

        <span style={lbl}>Standard targets</span>
        {PRESET_GROUPS.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{group}</div>
            {items.map(p => {
              const active = selectedKind === p.kind;
              return (
                <button key={p.kind} onClick={() => selectPreset(p)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 14px', marginBottom: 4, borderRadius: 8,
                  cursor: 'pointer', textAlign: 'left',
                  background: active ? C.primary : C.card,
                  border: `1px solid ${active ? C.primary : C.border}`,
                  color: active ? C.bg : C.text,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: active ? C.bg : C.muted, marginTop: 1 }}>{p.desc}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 12,
                    color: active ? C.bg : C.secondary }}>{p.w}×{p.h} mm</div>
                </button>
              );
            })}
          </div>
        ))}

        <span style={lbl}>Dimensions personnalisées</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Largeur (mm)</div>
            <input type="number" value={widthMm}
              onChange={e => { setWidthMm(e.target.value); setKind(null); }}
              style={field} placeholder="ex: 210" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Hauteur (mm)</div>
            <input type="number" value={heightMm}
              onChange={e => { setHeightMm(e.target.value); setKind(null); }}
              style={field} placeholder="ex: 297" />
          </div>
        </div>

        <span style={lbl}>Label (optionnel)</span>
        <input type="text" value={targetLabel} onChange={e => setLabel(e.target.value)}
          style={field} placeholder="ex: Sighters, 1re série, 100 m…" />

        <span style={lbl}>Image de la cible</span>
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          onChange={handleFile} style={{ display: 'none' }} />

        {imageData ? (
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <img src={imageData} style={{ width: '100%', borderRadius: 8, display: 'block' }} />
            {isPlaceholder && (
              <div style={{
                position: 'absolute', top: 8, left: 8,
                background: 'rgba(0,0,0,0.65)', borderRadius: 6,
                padding: '4px 8px', fontSize: 11, color: '#fff',
              }}>Gabarit généré</div>
            )}
            <button onClick={() => fileRef.current?.click()} style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.72)', border: 'none', borderRadius: 6,
              color: C.text, padding: '6px 10px', cursor: 'pointer', fontSize: 12,
            }}>📷 Ma photo</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} style={{
            width: '100%', padding: 28, borderRadius: 12,
            border: `2px dashed ${C.border}`, background: 'none',
            cursor: 'pointer', color: C.muted,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            {loading
              ? <span style={{ fontSize: 14 }}>Traitement…</span>
              : <><span style={{ fontSize: 36 }}>📷</span>
                <span style={{ fontSize: 14 }}>Upload ou prendre une photo</span>
                <span style={{ fontSize: 12 }}>(ou sélectionne un preset ci-dessus)</span></>
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
          Continuer — Placer les impacts →
        </button>
      </div>
    </Layout>
  );
}
