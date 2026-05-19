import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { C } from '../theme';

const TABS = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/sessions', label: 'Sessions', icon: '≡' },
  { to: '/analysis', label: 'Analysis', icon: '↗' },
  { to: '/equipment', label: 'Equipment', icon: '⚙' },
];

const SUB_TITLES: Record<string, string> = {
  '/sessions/new': 'New Session',
  '/equipment/new': 'Add Firearm',
};

interface Props {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export default function Layout({ title, children, action }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isTab = TABS.some(t => t.to === pathname);
  const subTitle = SUB_TITLES[pathname] || (pathname.startsWith('/sessions/') ? 'Session Detail' : null);
  const showBack = !isTab;
  const headerTitle = title || subTitle || (TABS.find(t => t.to === pathname)?.label ?? 'Groupr');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', minHeight: '100%', background: '#000' }}>
      <div style={{
        width: '100%', maxWidth: 430, minHeight: '100dvh',
        background: C.bg, display: 'flex', flexDirection: 'column',
        position: 'relative', boxShadow: '0 0 40px #000',
      }}>
        {/* Header */}
        <div style={{
          background: C.card, borderBottom: `1px solid ${C.border}`,
          padding: '0 16px', height: 56, display: 'flex', alignItems: 'center',
          gap: 12, flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
        }}>
          {showBack && (
            <button onClick={() => navigate(-1)} style={{
              background: 'none', border: 'none', color: C.primary, cursor: 'pointer',
              fontSize: 22, lineHeight: 1, padding: '4px 8px 4px 0',
            }}>‹</button>
          )}
          <span style={{ fontWeight: 700, fontSize: 17, color: C.text, flex: 1 }}>
            {headerTitle}
          </span>
          {action}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 68 }}>
          {children}
        </div>

        {/* Bottom tab bar */}
        <nav style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: C.card, borderTop: `1px solid ${C.border}`,
          display: 'flex', height: 60, zIndex: 20,
        }}>
          {TABS.map(t => (
            <NavLink key={t.to} to={t.to} end={t.to === '/'}
              style={({ isActive }) => ({
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 2, textDecoration: 'none',
                color: isActive ? C.primary : C.muted,
                transition: 'color 0.15s',
              })}
            >
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
