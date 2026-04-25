"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  areaColor?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "#C8E43B",
  areaColor
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line
          x1={width * 0.1}
          y1={height / 2}
          x2={width * 0.9}
          y2={height / 2}
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity="0.35"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const toCoords = (v: number, i: number): [number, number] => [
    pad + (i / (data.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / range) * (height - pad * 2)
  ];

  const coords = data.map(toCoords);
  const pointsStr = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const [lastX, lastY] = coords[coords.length - 1];
  const [firstX] = coords[0];

  const areaPath = [
    `M ${firstX},${height}`,
    ...coords.map(([x, y]) => `L ${x},${y}`),
    `L ${lastX},${height}`,
    "Z"
  ].join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {areaColor && (
        <path d={areaPath} fill={areaColor} opacity="0.12" />
      )}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pointsStr}
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}
