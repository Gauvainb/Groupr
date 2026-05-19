import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import Layout from '../components/Layout';
import { getChartData } from '../db/store';
import { C, card } from '../theme';

interface Point { label: string; scorePct: number | null; avgGroupMm: number | null }

const chartStyle = { background: C.card, border: 'none', borderRadius: 8, color: C.text, fontSize: 12 };

export default function AnalysisPage() {
  const [data, setData] = useState<Point[]>(getChartData());

  useEffect(() => {
    const refresh = () => setData(getChartData());
    window.addEventListener('store:update', refresh);
    return () => window.removeEventListener('store:update', refresh);
  }, []);

  const scoreData = data.filter(p => p.scorePct != null);
  const groupData = data.filter(p => p.avgGroupMm != null);

  const sectionTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: C.muted,
    textTransform: 'uppercase', letterSpacing: 1,
    margin: '20px 0 10px',
  };

  if (data.length === 0) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', marginTop: 80, color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 8 }}>No data yet</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, padding: '0 32px' }}>
            Log sessions and group measurements to see your trends here.
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: 16, paddingBottom: 32 }}>
        {scoreData.length >= 2 ? (
          <>
            <div style={sectionTitle}>Score Trend</div>
            <div style={{ ...card, padding: '16px 8px 8px' }}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={scoreData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }} unit="%" />
                  <Tooltip contentStyle={chartStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Score']} />
                  <Line type="monotone" dataKey="scorePct" stroke={C.secondary} strokeWidth={2}
                    dot={{ fill: C.secondary, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : scoreData.length === 1 ? (
          <div style={{ ...card, marginTop: 20 }}>
            <div style={{ fontSize: 13, color: C.muted }}>Score trend appears after 2+ sessions with a score.</div>
          </div>
        ) : null}

        {groupData.length >= 2 ? (
          <>
            <div style={sectionTitle}>Average Group Size</div>
            <div style={{ ...card, padding: '16px 8px 8px' }}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={groupData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }} unit=" mm" />
                  <Tooltip contentStyle={chartStyle} formatter={(v: number) => [`${v.toFixed(1)} mm`, 'Avg Group']} />
                  <Line type="monotone" dataKey="avgGroupMm" stroke={C.success} strokeWidth={2}
                    dot={{ fill: C.success, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
              Lower is better — a downward trend means tightening groups.
            </div>
          </>
        ) : groupData.length === 1 ? (
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ fontSize: 13, color: C.muted }}>Group size trend appears after logging groups in 2+ sessions.</div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
