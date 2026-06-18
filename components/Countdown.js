'use client';

import { useEffect, useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');

export default function Countdown({ deadlineMs }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Render a stable placeholder until mounted (avoids hydration mismatch).
  if (now == null) return <span>—</span>;

  const diff = deadlineMs - now;
  if (diff <= 0) return <span style={{ color: '#A32D2D' }}>Past due</span>;

  const total = Math.floor(diff / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: '0.78em' }}>
      {h}h {pad(m)}m {pad(s)}s
    </span>
  );
}
