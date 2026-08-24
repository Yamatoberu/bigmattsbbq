import type { TrendPoint } from "../../lib/sca/trends";
import { formatScoreValue } from "../../lib/sca/format";

const TITLE_CLASSES = "text-xs font-semibold uppercase tracking-[0.25em] text-smoke-800";
const CAPTION_CLASSES = "mt-3 text-sm text-smoke-800";

const PLOT_X_MIN = 16;
const PLOT_X_MAX = 584;
const PLOT_WIDTH = PLOT_X_MAX - PLOT_X_MIN;
const PLOT_Y_MIN = 28;
const PLOT_Y_MAX = 132;
const PLOT_HEIGHT = PLOT_Y_MAX - PLOT_Y_MIN;

const ACCENT_COLORS: Record<"ember" | "gold", string> = {
  ember: "#ff5f3b",
  gold: "#d8b56a"
};

interface TrendChartProps {
  title: string;
  points: TrendPoint[];
  accent: "ember" | "gold";
}

interface YDomain {
  min: number;
  max: number;
}

function computeYDomain(values: number[]): YDomain {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = (rawMax - rawMin) * 0.1;
  return { min: rawMin - padding, max: rawMax + padding };
}

function scaleY(value: number, domain: YDomain): number {
  const span = domain.max - domain.min;
  if (span === 0) {
    return PLOT_Y_MIN + PLOT_HEIGHT / 2;
  }
  const t = (value - domain.min) / span;
  return PLOT_Y_MAX - t * PLOT_HEIGHT;
}

function buildXPositions(count: number): number[] {
  const positions: number[] = [];
  for (let index = 0; index < count; index += 1) {
    positions.push(PLOT_X_MIN + (index / (count - 1)) * PLOT_WIDTH);
  }
  return positions;
}

function findLabelIndices(points: TrendPoint[]): number[] {
  let minIndex = 0;
  let maxIndex = 0;
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].value < points[minIndex].value) {
      minIndex = index;
    }
    if (points[index].value > points[maxIndex].value) {
      maxIndex = index;
    }
  }
  const indices = new Set<number>([0, points.length - 1, minIndex, maxIndex]);
  return Array.from(indices).sort((a, b) => a - b);
}

export function TrendChart({ title, points, accent }: TrendChartProps) {
  const color = ACCENT_COLORS[accent];
  const singlePoint = points.length === 1;
  const hasData = points.length > 0;

  let caption = "";
  let ariaLabel = "";
  let body: JSX.Element | null = null;

  if (points.length === 0) {
    caption = "No cooks recorded yet.";
  } else if (singlePoint) {
    const point = points[0];
    caption = "Not enough data yet.";
    ariaLabel = `${title} trend: ${points.length} cooks from ${point.label} to ${point.label}, latest ${formatScoreValue(point.value)}`;
    body = (
      <circle
        cx={PLOT_X_MIN + PLOT_WIDTH / 2}
        cy={PLOT_Y_MIN + PLOT_HEIGHT / 2}
        r={3}
        fill={color}
      />
    );
  } else {
    const values = points.map((point) => point.value);
    const domain = computeYDomain(values);
    const xPositions = buildXPositions(points.length);
    const yPositions = values.map((value) => scaleY(value, domain));
    const first = points[0];
    const last = points[points.length - 1];
    const labelIndices = findLabelIndices(points);
    const polylinePoints = xPositions
      .map((x, index) => `${x},${yPositions[index]}`)
      .join(" ");

    caption = `${points.length} cooks · latest ${formatScoreValue(last.value)}`;
    ariaLabel = `${title} trend: ${points.length} cooks from ${first.label} to ${last.label}, latest ${formatScoreValue(last.value)}`;

    body = (
      <>
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle key={point.cookId} cx={xPositions[index]} cy={yPositions[index]} r={3} fill={color} />
        ))}
        {labelIndices.map((index) => {
          const y = yPositions[index];
          const dy = y < PLOT_Y_MIN + 0.2 * PLOT_HEIGHT ? "14" : "-8";
          return (
            <text
              key={`value-${points[index].cookId}`}
              x={xPositions[index]}
              y={y}
              dy={dy}
              fill="#f7f1e6"
              fontSize="12"
              textAnchor="middle"
            >
              {formatScoreValue(points[index].value)}
            </text>
          );
        })}
        <text x="16" y="152" textAnchor="start" fill="#e8ddd1" fontSize="11">
          {first.label}
        </text>
        <text x="584" y="152" textAnchor="end" fill="#e8ddd1" fontSize="11">
          {last.label}
        </text>
      </>
    );
  }

  return (
    <div className="glass-card p-6">
      <p className={TITLE_CLASSES}>{title}</p>
      {hasData && (
        <svg viewBox="0 0 600 160" role="img" aria-label={ariaLabel} className="mt-4 w-full">
          {body}
        </svg>
      )}
      <p className={CAPTION_CLASSES}>{caption}</p>
    </div>
  );
}
