import { cn } from "@/lib/utils";

export interface ChartPoint {
  label: string;
  value: number;
  secondary?: number;
}

const LINE_VIEW = { width: 720, height: 220, padding: 12 };

/**
 * Hand-rolled SVG so the portals stay dependency-free and the charts render on
 * the server with no hydration pass.
 */
export function LineChart({
  points,
  format,
  className,
  ariaLabel,
  labelEvery = 1,
}: {
  points: ChartPoint[];
  format: (value: number) => string;
  className?: string;
  ariaLabel?: string;
  labelEvery?: number;
}) {
  if (points.length === 0) return <ChartEmpty className={className} />;

  const { width, height, padding } = LINE_VIEW;
  const values = points.map((point) => point.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const yFor = (value: number) =>
    height - padding - ((value - min) / span) * (height - padding * 2);
  const xFor = (index: number) => padding + index * stepX;

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(point.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xFor(points.length - 1).toFixed(1)},${height - padding} L${xFor(0).toFixed(1)},${height - padding} Z`;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
        role={ariaLabel ? "img" : undefined}
        aria-label={ariaLabel}
        preserveAspectRatio="none"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = padding + fraction * (height - padding * 2);
          return (
            <line
              key={fraction}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
          );
        })}
        <path d={area} fill="var(--color-brand-100)" opacity={0.75} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-brand-500)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point, index) => (
          <circle
            key={point.label}
            cx={xFor(index)}
            cy={yFor(point.value)}
            r={4}
            fill="var(--color-surface)"
            stroke="var(--color-brand-600)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${point.label}: ${format(point.value)}`}</title>
          </circle>
        ))}
      </svg>
      <Axis labels={spacedLabels(points, labelEvery)} />
    </div>
  );
}

export function BarChart({
  points,
  format,
  secondaryFormat,
  className,
  height = 176,
  labelEvery = 1,
}: {
  points: ChartPoint[];
  format: (value: number) => string;
  secondaryFormat?: (value: number) => string;
  className?: string;
  height?: number;
  labelEvery?: number;
}) {
  if (points.length === 0) return <ChartEmpty className={className} />;

  const max = Math.max(
    ...points.map((point) => Math.max(point.value, point.secondary ?? 0)),
    1,
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {points.map((point) => {
          const primary = Math.max(2, Math.round((point.value / max) * 100));
          const secondary =
            point.secondary === undefined
              ? null
              : Math.max(2, Math.round((point.secondary / max) * 100));
          return (
            <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div
                  className="w-full max-w-[26px] rounded-t-[5px] bg-brand-500 transition-colors hover:bg-brand-600"
                  style={{ height: `${primary}%` }}
                  title={`${point.label}: ${format(point.value)}`}
                />
                {secondary !== null && (
                  <div
                    className="w-full max-w-[26px] rounded-t-[5px] bg-brand-200 transition-colors hover:bg-brand-300"
                    style={{ height: `${secondary}%` }}
                    title={
                      secondaryFormat
                        ? `${point.label}: ${secondaryFormat(point.secondary ?? 0)}`
                        : `${point.label}: ${point.secondary}`
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Axis labels={spacedLabels(points, labelEvery)} />
    </div>
  );
}

const DONUT_COLORS = [
  "var(--color-brand-500)",
  "var(--color-brand-300)",
  "var(--color-brand-700)",
  "var(--color-brand-200)",
  "var(--color-brand-900)",
  "var(--color-brand-100)",
];

export function DonutChart({
  slices,
  format,
  className,
}: {
  slices: { label: string; value: number }[];
  format: (value: number) => string;
  className?: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return <ChartEmpty className={className} />;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-5", className)}>
      <svg viewBox="0 0 100 100" className="size-[132px] shrink-0 -rotate-90" aria-hidden="true">
        {slices.map((slice, index) => {
          const fraction = slice.value / total;
          const dash = fraction * circumference;
          const element = (
            <circle
              key={slice.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
              strokeWidth={14}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            >
              <title>{`${slice.label}: ${format(slice.value)}`}</title>
            </circle>
          );
          offset += dash;
          return element;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((slice, index) => (
          <li key={slice.label} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-ink-soft">{slice.label}</span>
            <span className="font-semibold tabular-nums text-ink">
              {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RankedList({
  rows,
  className,
}: {
  rows: { title: string; subtitle?: string; value: string; share: number }[];
  className?: string;
}) {
  if (rows.length === 0) return <ChartEmpty className={className} />;
  const max = Math.max(...rows.map((row) => row.share), 1);

  return (
    <ol className={cn("divide-y divide-line", className)}>
      {rows.map((row, index) => (
        <li key={row.title} className="px-5 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="w-4 shrink-0 text-[11px] font-bold tabular-nums text-muted">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {row.title}
                </span>
                {row.subtitle && (
                  <span className="block truncate text-[11px] text-muted">{row.subtitle}</span>
                )}
              </span>
            </span>
            <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-ink">
              {row.value}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-page">
            <div
              className="h-full rounded-full bg-brand-400"
              style={{ width: `${Math.max(3, Math.round((row.share / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; tone: "primary" | "secondary" }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-4 text-[11.5px] text-muted", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-2.5 rounded-full",
              item.tone === "primary" ? "bg-brand-500" : "bg-brand-200",
            )}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function spacedLabels(points: ChartPoint[], every: number): (string | null)[] {
  const step = Math.max(1, every);
  return points.map((point, index) =>
    index % step === 0 || index === points.length - 1 ? point.label : null,
  );
}

function Axis({ labels }: { labels: (string | null)[] }) {
  return (
    <div className="mt-2 flex gap-1 overflow-hidden">
      {labels.map((label, index) => (
        <span
          // Blank slots keep dense series readable without shifting columns.
          key={`${label ?? "blank"}-${index}`}
          className="min-w-0 flex-1 truncate text-center text-[10.5px] font-semibold text-muted"
        >
          {label ?? ""}
        </span>
      ))}
    </div>
  );
}

function ChartEmpty({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid h-40 place-items-center rounded-xl border border-dashed border-line-strong bg-page/60 text-[12.5px] text-muted",
        className,
      )}
    >
      No data in this range yet
    </div>
  );
}
