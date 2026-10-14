"use client";

import { useMemo } from "react";

type Props = {
  path: number[];
  requests: number[];
  size: number;
  step: number;
};

export default function DiskSeekGraph({
  path,
  requests,
  size,
  step,
}: Props) {
  const width = 1000;
  const height = 400;
  const left = 45;
  const right = 35;
  const top = 55;
  const bottom = 25;

  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxCylinder = Math.max(size - 1, 1);
  const maxSteps = Math.max(path.length - 1, 1);

  const x = (cylinder: number) =>
    left + (cylinder / maxCylinder) * plotWidth;

  const y = (index: number) =>
    top + (index / maxSteps) * plotHeight;

  const visiblePath = path.slice(0, Math.min(step + 1, path.length));

  const uniqueCylinders = useMemo(() => {
    return Array.from(new Set([0, ...requests, ...path, size - 1]))
      .filter((n) => Number.isFinite(n) && n >= 0 && n < size)
      .sort((a, b) => a - b);
  }, [requests, path, size]);

  // Stagger label tiers if adjacent ticks are closer than 34px horizontally
  const getTickTier = (idx: number) => {
    const curX = x(uniqueCylinders[idx]);
    const prevX = idx > 0 ? x(uniqueCylinders[idx - 1]) : -Infinity;
    const nextX =
      idx < uniqueCylinders.length - 1 ? x(uniqueCylinders[idx + 1]) : Infinity;
    const isCrowded = curX - prevX < 36 || nextX - curX < 36;
    return isCrowded && idx % 2 === 1 ? 1 : 0;
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-[#0c1222] p-3 text-slate-100 sm:p-4">
      {/* SVG Seek Diagram */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full select-none"
        role="img"
        aria-label="Disk head seek trajectory plot with cylinders on horizontal axis and sequence steps on vertical axis"
      >
        <defs>
          {/* Arrow marker for standard seeks */}
          <marker
            id="seek-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="5"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 7 3.5, 0 7" fill="#06b6d4" />
          </marker>

          {/* Arrow marker for reset return */}
          <marker
            id="reset-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="5"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 7 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>

        {/* Plot background */}
        <rect
          x={left}
          y={top}
          width={plotWidth}
          height={plotHeight}
          fill="#080d19"
          rx="4"
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* Step horizontal guidelines */}
        {path.map((_, idx) => (
          <line
            key={`hline-${idx}`}
            x1={left}
            y1={y(idx)}
            x2={left + plotWidth}
            y2={y(idx)}
            stroke="#10192b"
            strokeWidth="1"
          />
        ))}

        {/* Vertical cylinder grid lines */}
        {uniqueCylinders.map((cyl) => (
          <line
            key={`grid-${cyl}`}
            x1={x(cyl)}
            y1={top}
            x2={x(cyl)}
            y2={top + plotHeight}
            stroke="#162238"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        ))}

        {/* Top axis bar */}
        <line
          x1={left}
          y1={top}
          x2={left + plotWidth}
          y2={top}
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Cylinder tick marks & staggered labels */}
        {uniqueCylinders.map((cyl, idx) => {
          const tier = getTickTier(idx);
          const tickTop = tier === 1 ? top - 18 : top - 9;
          const textY = tier === 1 ? top - 22 : top - 12;
          const isInitialHead = cyl === path[0];

          return (
            <g key={`tick-${cyl}`}>
              <line
                x1={x(cyl)}
                y1={tickTop}
                x2={x(cyl)}
                y2={top}
                stroke={isInitialHead ? "#06b6d4" : "#475569"}
                strokeWidth={isInitialHead ? "1.8" : "1"}
              />
              <text
                x={x(cyl)}
                y={textY}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isInitialHead ? "bold" : "normal"}
                fill={isInitialHead ? "#22d3ee" : "#94a3b8"}
                fontFamily="ui-monospace, monospace"
              >
                {cyl}
              </text>
            </g>
          );
        })}

        {/* Bottom axis bar */}
        <line
          x1={left}
          y1={top + plotHeight}
          x2={left + plotWidth}
          y2={top + plotHeight}
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* Step index labels along left margin */}
        {path.map((_, idx) => (
          <text
            key={`step-lbl-${idx}`}
            x={left - 8}
            y={y(idx) + 3.5}
            textAnchor="end"
            fontSize="9"
            fill="#475569"
            fontFamily="ui-monospace, monospace"
          >
            {idx === 0 ? "0" : idx}
          </text>
        ))}

        {/* Seek trajectory path lines */}
        {visiblePath.slice(1).map((cyl, index) => {
          const prev = visiblePath[index];
          const isReset =
            (prev === size - 1 && cyl === 0) ||
            (prev === 0 && cyl === size - 1);

          return (
            <line
              key={`line-${index}`}
              x1={x(prev)}
              y1={y(index)}
              x2={x(cyl)}
              y2={y(index + 1)}
              stroke={isReset ? "#64748b" : "#06b6d4"}
              strokeWidth={isReset ? "1.5" : "2"}
              strokeDasharray={isReset ? "4 4" : undefined}
              markerEnd={isReset ? "url(#reset-arrow)" : "url(#seek-arrow)"}
            />
          );
        })}

        {/* Trajectory node circles */}
        {visiblePath.map((cyl, index) => {
          const isCurrent = index === visiblePath.length - 1;
          const isStart = index === 0;

          return (
            <g key={`point-${index}`}>
              {/* Ring around current head */}
              {isCurrent && (
                <circle
                  cx={x(cyl)}
                  cy={y(index)}
                  r="9"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                  opacity="0.8"
                />
              )}

              {/* Node dot */}
              <circle
                cx={x(cyl)}
                cy={y(index)}
                r={isCurrent ? "5" : isStart ? "4" : "3"}
                fill={isCurrent ? "#22d3ee" : isStart ? "#0891b2" : "#06b6d4"}
                stroke="#080d19"
                strokeWidth="1.5"
              />

              {/* Badge for current head value */}
              {isCurrent && (
                <g>
                  <rect
                    x={
                      x(cyl) > width - 110
                        ? x(cyl) - 44
                        : x(cyl) + 8
                    }
                    y={y(index) - 9}
                    width="36"
                    height="18"
                    rx="3"
                    fill="#0891b2"
                  />
                  <text
                    x={
                      x(cyl) > width - 110
                        ? x(cyl) - 26
                        : x(cyl) + 26
                    }
                    y={y(index) + 3}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#ffffff"
                    fontFamily="ui-monospace, monospace"
                  >
                    {cyl}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
