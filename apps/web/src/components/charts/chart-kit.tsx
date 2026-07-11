import type { ReactNode } from 'react';

/** Themed tooltip for recharts — surface card, soft shadow, mono numbers. */
export function ChartTooltip({ active, payload, label, suffix = '', formatter }: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  suffix?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-[10px] border border-border bg-surface shadow-soft-lg px-3 py-2 min-w-[128px]">
      {label !== undefined && (
        <div className="text-[11px] text-ink-3 mb-1.5 font-medium">{label}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: p.color || p.stroke || p.fill }} />
            <span className="text-ink-2 flex-1">{p.name}</span>
            <span className="font-mono font-bold text-ink tabular-nums">
              {formatter ? formatter(p.value) : p.value}{suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Shared axis styling props. */
export const axisProps = {
  tick: { fontSize: 11, fill: 'var(--text-3)', fontFamily: '"JetBrains Mono", monospace' },
  tickLine: false as const,
  axisLine: false as const,
};

/** Horizontal-only dashed grid in the muted border color. */
export const gridProps = {
  strokeDasharray: '4 4',
  stroke: 'var(--border)',
  vertical: false as const,
};

/** SVG gradient defs for area/bar fills. Render inside a chart's <defs>. */
export function ChartGradients({ ids }: { ids: { id: string; color: string }[] }): ReactNode {
  return (
    <defs>
      {ids.map(({ id, color }) => (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  );
}
