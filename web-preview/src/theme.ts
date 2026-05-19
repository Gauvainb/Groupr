export const C = {
  bg: '#0D1117',
  card: '#161B22',
  cardAlt: '#1C2128',
  border: '#30363D',
  primary: '#F0A500',
  secondary: '#58A6FF',
  success: '#3FB950',
  danger: '#F85149',
  text: '#E6EDF3',
  muted: '#8B949E',
} as const;

export const card: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 16,
};
