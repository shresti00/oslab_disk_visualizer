"use client";

import DiskSeekGraph from "./components/DiskSeekGraph";
import { useEffect, useMemo, useState } from "react";

type Algorithm = "FCFS" | "SSTF" | "SCAN" | "C-SCAN" | "LOOK" | "C-LOOK";

const algorithms: Algorithm[] = [
  "FCFS",
  "SSTF",
  "SCAN",
  "C-SCAN",
  "LOOK",
  "C-LOOK",
];

const algorithmDetails: Record<
  Algorithm,
  { name: string; subtitle: string }
> = {
  FCFS: { name: "FCFS", subtitle: "First-Come, First-Served" },
  SSTF: { name: "SSTF", subtitle: "Shortest Seek Time First" },
  SCAN: { name: "SCAN", subtitle: "Elevator Algorithm" },
  "C-SCAN": { name: "C-SCAN", subtitle: "Circular SCAN" },
  LOOK: { name: "LOOK", subtitle: "Look Ahead" },
  "C-LOOK": { name: "C-LOOK", subtitle: "Circular LOOK" },
};

type Result = {
  sequence: number[];
  movement: number;
};

export function schedule(
  algorithm: Algorithm,
  requests: number[],
  head: number,
  size: number,
  direction: "left" | "right"
): Result {
  if (requests.length === 0) {
    return { sequence: [], movement: 0 };
  }

  const sorted = [...requests].sort((a, b) => a - b);
  let sequence: number[] = [];

  if (algorithm === "FCFS") {
    sequence = [...requests];
  } else if (algorithm === "SSTF") {
    const remaining = [...requests];
    let current = head;
    let currDir = direction;

    while (remaining.length > 0) {
      let best = 0;
      let minDiff = Math.abs(remaining[0] - current);

      for (let i = 1; i < remaining.length; i++) {
        const diff = Math.abs(remaining[i] - current);
        if (diff < minDiff) {
          minDiff = diff;
          best = i;
        } else if (diff === minDiff) {
          const candidateGoesCurrentDir =
            (currDir === "right" && remaining[i] >= current) ||
            (currDir === "left" && remaining[i] <= current);
          const bestGoesCurrentDir =
            (currDir === "right" && remaining[best] >= current) ||
            (currDir === "left" && remaining[best] <= current);

          if (candidateGoesCurrentDir && !bestGoesCurrentDir) {
            best = i;
          }
        }
      }

      const nextTarget = remaining.splice(best, 1)[0];
      if (nextTarget > current) currDir = "right";
      else if (nextTarget < current) currDir = "left";
      current = nextTarget;
      sequence.push(current);
    }
  } else {
    const atHead = sorted.filter((r) => r === head);
    const left = sorted.filter((r) => r < head);
    const right = sorted.filter((r) => r > head);
    const initial = [...atHead];

    if (algorithm === "SCAN") {
      if (direction === "right") {
        sequence = [...initial, ...right];
        if (left.length > 0) {
          if (
            sequence.length === 0 ||
            sequence[sequence.length - 1] !== size - 1
          ) {
            sequence.push(size - 1);
          }
          sequence.push(...[...left].reverse());
        }
      } else {
        sequence = [...initial, ...[...left].reverse()];
        if (right.length > 0) {
          if (sequence.length === 0 || sequence[sequence.length - 1] !== 0) {
            sequence.push(0);
          }
          sequence.push(...right);
        }
      }
    } else if (algorithm === "C-SCAN") {
      if (direction === "right") {
        sequence = [...initial, ...right];
        if (left.length > 0) {
          if (
            sequence.length === 0 ||
            sequence[sequence.length - 1] !== size - 1
          ) {
            sequence.push(size - 1);
          }
          sequence.push(0);
          const remainingLeft = left.filter((r) => r !== 0);
          sequence.push(...remainingLeft);
        }
      } else {
        sequence = [...initial, ...[...left].reverse()];
        if (right.length > 0) {
          if (sequence.length === 0 || sequence[sequence.length - 1] !== 0) {
            sequence.push(0);
          }
          sequence.push(size - 1);
          const remainingRight = right.filter((r) => r !== size - 1);
          sequence.push(...[...remainingRight].reverse());
        }
      }
    } else if (algorithm === "LOOK") {
      if (direction === "right") {
        sequence = [...initial, ...right, ...[...left].reverse()];
      } else {
        sequence = [...initial, ...[...left].reverse(), ...right];
      }
    } else if (algorithm === "C-LOOK") {
      if (direction === "right") {
        sequence = [...initial, ...right, ...left];
      } else {
        sequence = [...initial, ...[...left].reverse(), ...[...right].reverse()];
      }
    }
  }

  const path = [head, ...sequence];
  const movement = path.slice(1).reduce(
    (sum, value, i) => sum + Math.abs(value - path[i]),
    0
  );

  return { sequence, movement };
}

export default function Home() {
  const [queueInput, setQueueInput] = useState(
    "98, 183, 37, 122, 14, 124, 65, 67"
  );
  const [headInput, setHeadInput] = useState("53");
  const [sizeInput, setSizeInput] = useState("200");
  const [seekTimeInput, setSeekTimeInput] = useState("2");
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [selected, setSelected] = useState<Algorithm>("SCAN");
  const [speed, setSpeed] = useState(650);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const requests = useMemo(() => {
    return queueInput
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);
  }, [queueInput]);

  const head = Number(headInput);
  const size = Number(sizeInput);
  const seekTimePerCylinder = Math.max(0.01, Number(seekTimeInput) || 2);

  const validationError = useMemo(() => {
    if (sizeInput.trim() === "" || !Number.isInteger(size) || size < 2) {
      return "Total cylinders must be an integer of at least 2.";
    }
    if (
      headInput.trim() === "" ||
      !Number.isInteger(head) ||
      head < 0 ||
      head >= size
    ) {
      return `Initial head position must be an integer between 0 and ${size - 1}.`;
    }
    if (seekTimeInput.trim() === "" || Number(seekTimeInput) <= 0) {
      return "Seek time per cylinder must be a positive number.";
    }
    if (queueInput.trim() === "" || requests.length === 0) {
      return "Please enter at least one cylinder request.";
    }
    const invalidItem = requests.find(
      (n) => !Number.isInteger(n) || n < 0 || n >= size
    );
    if (invalidItem !== undefined) {
      return `Invalid cylinder (${invalidItem}): requests must be integers between 0 and ${
        size - 1
      }.`;
    }
    return "";
  }, [sizeInput, size, headInput, head, seekTimeInput, queueInput, requests]);

  const valid = validationError === "";

  const results = useMemo(() => {
    if (!valid) return {} as Record<Algorithm, Result>;

    return Object.fromEntries(
      algorithms.map((a) => [
        a,
        schedule(a, requests, head, size, direction),
      ])
    ) as Record<Algorithm, Result>;
  }, [valid, requests, head, size, direction]);

  const result = results[selected];
  const path = result ? [head, ...result.sequence] : [];
  const currentHead =
    path[Math.min(step, Math.max(0, path.length - 1))] ?? head;
  const prevHead =
    step > 0 && path[step - 1] !== undefined ? path[step - 1] : head;
  const maxCylinder = Math.max(size - 1, 1);

  // Find winning algorithm to encode meaning strictly in green
  const winningAlgorithm = useMemo(() => {
    const validMovements = algorithms
      .map((a) => ({ algo: a, mov: results[a]?.movement }))
      .filter((item): item is { algo: Algorithm; mov: number } => typeof item.mov === "number");

    if (validMovements.length === 0) return null;
    const minMov = Math.min(...validMovements.map((m) => m.mov));
    return validMovements.find((m) => m.mov === minMov)?.algo ?? null;
  }, [results]);

  // Stagger request badges to eliminate label overlap
  const sortedUniqueRequests = useMemo(() => {
    return Array.from(new Set(requests)).sort((a, b) => a - b);
  }, [requests]);

  const requestTiers = useMemo(() => {
    const tiers: Record<number, number> = {};
    sortedUniqueRequests.forEach((r, idx) => {
      if (idx === 0) {
        tiers[r] = 0;
      } else {
        const prevR = sortedUniqueRequests[idx - 1];
        const isClose = (r - prevR) / maxCylinder < 0.045;
        if (isClose) {
          tiers[r] = (tiers[prevR] + 1) % 2;
        } else {
          tiers[r] = 0;
        }
      }
    });
    return tiers;
  }, [sortedUniqueRequests, maxCylinder]);

  useEffect(() => {
    if (!playing || !result) return;

    const timer = setInterval(() => {
      setStep((previous) => {
        if (previous >= result.sequence.length) {
          setPlaying(false);
          return previous;
        }
        return previous + 1;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [playing, speed, result]);

  function reset() {
    setPlaying(false);
    setStep(0);
  }

  function chooseAlgorithm(a: Algorithm) {
    setSelected(a);
    setStep(0);
    setPlaying(false);
  }

  function loadDemo() {
    setQueueInput("98, 183, 37, 122, 14, 124, 65, 67");
    setHeadInput("53");
    setSizeInput("200");
    setSeekTimeInput("2");
    setDirection("right");
    reset();
  }

  const totalSeekTime = result
    ? (result.movement * seekTimePerCylinder).toFixed(1)
    : "—";

  const avgSeekTime =
    result && requests.length
      ? ((result.movement * seekTimePerCylinder) / requests.length).toFixed(1)
      : "—";

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 antialiased font-sans">
      <div className="mx-auto max-w-[1300px] p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header (Clean, no glowing blue dot) */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Disk Scheduling Visualizer
          </h1>
          <button
            onClick={loadDemo}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Load Demo
          </button>
        </header>

        {/* SECTION 1: UPPER SIDE-BY-SIDE LAYOUT (Settings on left, Algorithm cards & 1D Track on right) */}
        <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
          {/* Settings Sidebar */}
          <aside className="h-fit rounded-xl border border-slate-800 bg-[#0c1222] p-4 text-xs">
            <h2 className="mb-3 font-bold uppercase tracking-wider text-slate-400">
              Settings
            </h2>

            <label className="mb-1 block text-slate-300">
              Request queue
            </label>
            <textarea
              value={queueInput}
              onChange={(e) => {
                setQueueInput(e.target.value);
                reset();
              }}
              rows={3}
              className="mb-3 w-full rounded-lg border border-slate-700 bg-[#070c17] p-2 font-mono text-xs text-slate-200 outline-none transition focus:border-cyan-400"
              placeholder="98, 183, 37, 122, 14, 124, 65, 67"
            />

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="mb-1 block text-slate-300">
                  Initial head
                </label>
                <input
                  type="number"
                  value={headInput}
                  onChange={(e) => {
                    setHeadInput(e.target.value);
                    reset();
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-[#070c17] p-1.5 font-mono text-xs text-slate-200 outline-none transition focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-300">
                  Total cylinders
                </label>
                <input
                  type="number"
                  min="2"
                  value={sizeInput}
                  onChange={(e) => {
                    setSizeInput(e.target.value);
                    reset();
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-[#070c17] p-1.5 font-mono text-xs text-slate-200 outline-none transition focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1 flex justify-between text-slate-300">
                <span>Seek time (ms/cyl)</span>
                <span className="font-mono text-slate-400">{seekTimePerCylinder} ms</span>
              </div>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={seekTimeInput}
                onChange={(e) => setSeekTimeInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#070c17] p-1.5 font-mono text-xs text-slate-200 outline-none transition focus:border-cyan-400"
                placeholder="2.0"
              />
            </div>

            <label className="mb-1 block text-slate-300">
              Initial direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["left", "right"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDirection(d);
                    reset();
                  }}
                  className={`rounded-lg border p-1.5 text-xs font-medium transition ${
                    direction === d
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {d === "left" ? "← Left" : "Right →"}
                </button>
              ))}
            </div>

            {validationError && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300">
                {validationError}
              </div>
            )}
          </aside>

          {/* Right Column: Algorithm Selector Cards & 1D Track Visualization */}
          <section className="min-w-0 space-y-4">
            {/* Algorithm Selector Cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {algorithms.map((a) => {
                const mov = results[a]?.movement;
                const isSelected = selected === a;
                const isWinner = winningAlgorithm === a;

                return (
                  <button
                    key={a}
                    onClick={() => chooseAlgorithm(a)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-400/10 ring-1 ring-cyan-400/30"
                        : "border-slate-800 bg-[#0c1222] hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? "text-cyan-300" : "text-slate-200"
                        }`}
                      >
                        {a}
                      </span>
                      {isWinner && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-slate-400">
                      {mov !== undefined ? (
                        <span className={isWinner ? "font-bold text-emerald-400" : ""}>
                          {mov} cyl
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 1D Track Visualization with Compact Stats and Single Playback Controls */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1222] p-4 sm:p-5 shadow-lg">
              {/* Compact Stat Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <div>
                    <span>Movement:</span>{" "}
                    <span className="font-mono font-bold text-slate-100">
                      {result?.movement !== undefined ? `${result.movement} cyl` : "—"}
                    </span>
                  </div>
                  <span className="text-slate-700">|</span>
                  <div>
                    <span>Seek Time:</span>{" "}
                    <span className="font-mono font-bold text-slate-100">
                      {totalSeekTime} ms
                    </span>
                  </div>
                  <span className="text-slate-700">|</span>
                  <div>
                    <span>Avg:</span>{" "}
                    <span className="font-mono text-slate-300">{avgSeekTime} ms/req</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-300" /> Visited
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full border border-slate-600" /> Pending
                  </span>
                </div>
              </div>

              {/* 1D Track */}
              <div className="relative my-8 px-2 py-4">
                <div className="h-2 rounded-full bg-slate-800" />

                {/* Active sweep highlight segment */}
                <div
                  className="absolute top-4 h-2 rounded-full bg-cyan-400/40 transition-all duration-300"
                  style={{
                    left: `${(Math.min(prevHead, currentHead) / maxCylinder) * 100}%`,
                    width: `${(Math.abs(currentHead - prevHead) / maxCylinder) * 100}%`,
                  }}
                />

                {/* Staggered Request Nodes */}
                {sortedUniqueRequests.map((r) => {
                  const isVisited =
                    path.slice(1, step + 1).includes(r) ||
                    (r === head && step >= 0);
                  const tier = requestTiers[r] ?? 0;

                  return (
                    <div
                      key={r}
                      className="absolute top-4 -translate-x-1/2"
                      style={{ left: `${(r / maxCylinder) * 100}%` }}
                    >
                      <div
                        className={`h-3 w-3 -translate-y-1/2 rounded-full border transition-colors duration-300 ${
                          isVisited
                            ? "border-slate-400 bg-slate-200"
                            : "border-slate-500 bg-slate-900"
                        }`}
                      />

                      {tier === 1 ? (
                        <div className="absolute -top-6 left-1/2 flex -translate-x-1/2 flex-col items-center">
                          <span className="rounded border border-slate-700/80 bg-slate-900 px-1 py-0.2 font-mono text-[10px] font-medium text-slate-300">
                            {r}
                          </span>
                          <div className="h-1 w-px bg-slate-600" />
                        </div>
                      ) : (
                        <div className="absolute top-2 left-1/2 flex -translate-x-1/2 flex-col items-center">
                          <div className="h-1 w-px bg-slate-600" />
                          <span className="rounded border border-slate-700/80 bg-slate-900 px-1 py-0.2 font-mono text-[10px] font-medium text-slate-300">
                            {r}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Head cursor with cylinder number */}
                <div
                  className="absolute top-4 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                  style={{
                    left: `${(currentHead / maxCylinder) * 100}%`,
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full border-2 border-white bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                    <span className="absolute -top-5 rounded bg-cyan-950 px-1 font-mono text-[10px] font-bold text-cyan-300 border border-cyan-400/40">
                      {currentHead}
                    </span>
                  </div>
                </div>
              </div>

              {/* Axis markers */}
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>0</span>
                <span>{Math.floor((size - 1) / 2)}</span>
                <span>{size - 1}</span>
              </div>

              {/* Unified Controls & Single Authoritative Step Counter */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (result && step >= result.sequence.length) {
                        setStep(0);
                      }
                      setPlaying(true);
                    }}
                    disabled={!valid || playing}
                    className="rounded-lg bg-cyan-400 px-3.5 py-1.5 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
                  >
                    {result && step >= result.sequence.length ? "↺ Replay" : "▶ Play"}
                  </button>
                  <button
                    onClick={() => setPlaying(false)}
                    disabled={!playing}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    ⏸ Pause
                  </button>
                  <button
                    onClick={() => {
                      setPlaying(false);
                      setStep((s) => Math.max(0, s - 1));
                    }}
                    disabled={!result || step === 0}
                    className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => {
                      setPlaying(false);
                      setStep((s) =>
                        Math.min(s + 1, result?.sequence.length ?? 0)
                      );
                    }}
                    disabled={!result || step >= (result?.sequence.length ?? 0)}
                    className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    Next →
                  </button>
                  <button
                    onClick={reset}
                    className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-slate-300 transition hover:bg-slate-800"
                  >
                    ↺ Reset
                  </button>
                </div>

                <div className="flex items-center gap-4 text-slate-400">
                  <span className="font-mono text-xs">
                    Step {step} / {result?.sequence.length ?? 0}
                  </span>

                  <div className="flex items-center gap-2">
                    <span>Speed</span>
                    <input
                      type="range"
                      min="150"
                      max="1500"
                      step="50"
                      value={1650 - speed}
                      onChange={(e) => setSpeed(1650 - Number(e.target.value))}
                      className="w-20 accent-cyan-400 sm:w-28"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* SECTION 2: LOWER SECTION (2D Seek Graph, Seek Sequence, & Comparison Table - Full Width) */}
        <div className="w-full space-y-4 pt-1">
          {/* 2D Seek Trajectory Graph */}
          <DiskSeekGraph
            path={path}
            requests={requests}
            size={size}
            step={step}
          />

          {/* Centered Seek Sequence */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1222] p-3.5 sm:p-4">
            <h2 className="mb-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Seek Sequence
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-xs transition ${
                  step === 0
                    ? "border-cyan-400 bg-cyan-400/10 font-bold text-cyan-300"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                {head}
              </span>

              {result?.sequence.map((r, i) => {
                const isCurrent = i === step - 1;
                const isPast = i < step - 1;

                return (
                  <div key={`${r}-${i}`} className="flex items-center gap-1.5">
                    <span className="text-slate-600 text-xs">→</span>
                    <span
                      className={`rounded-md border px-2 py-0.5 font-mono text-xs transition ${
                        isCurrent
                          ? "border-cyan-400 bg-cyan-400/20 font-bold text-cyan-200"
                          : isPast
                          ? "border-slate-600 bg-slate-800/80 text-slate-200"
                          : "border-slate-800 bg-slate-950 text-slate-500"
                      }`}
                    >
                      {r}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Centered Algorithm Comparison Table (Green ONLY for winning algorithm) */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1222] p-3.5 sm:p-4">
            <h2 className="mb-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Algorithm Comparison
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs">
                    <th className="pb-2 font-medium">Algorithm</th>
                    <th className="pb-2 font-medium">Head Movement</th>
                    <th className="pb-2 font-medium">Seek Time</th>
                    <th className="pb-2 font-medium">Avg / Req</th>
                    <th className="pb-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {algorithms.map((a) => {
                    const movement = results[a]?.movement;
                    const isWinner = winningAlgorithm === a;
                    const isSelected = selected === a;
                    const algoSeekTime =
                      movement !== undefined
                        ? (movement * seekTimePerCylinder).toFixed(1)
                        : "—";
                    const avgTime =
                      movement !== undefined && requests.length > 0
                        ? ((movement * seekTimePerCylinder) / requests.length).toFixed(1)
                        : "—";

                    return (
                      <tr
                        key={a}
                        onClick={() => chooseAlgorithm(a)}
                        className={`cursor-pointer border-b border-slate-800/50 transition hover:bg-slate-800/30 ${
                          isSelected ? "bg-cyan-400/5" : ""
                        }`}
                      >
                        <td className="py-2 font-medium text-slate-200">
                          {a}{" "}
                          <span className="text-[11px] font-normal text-slate-500">
                            ({algorithmDetails[a].subtitle})
                          </span>
                        </td>
                        <td
                          className={`py-2 font-mono ${
                            isWinner
                              ? "font-bold text-emerald-400"
                              : "text-slate-400"
                          }`}
                        >
                          {movement !== undefined ? `${movement} cyl` : "—"}
                        </td>
                        <td
                          className={`py-2 font-mono ${
                            isWinner
                              ? "font-bold text-emerald-400"
                              : "text-slate-400"
                          }`}
                        >
                          {algoSeekTime !== "—" ? `${algoSeekTime} ms` : "—"}
                        </td>
                        <td className="py-2 font-mono text-slate-400">
                          {avgTime !== "—" ? `${avgTime} ms` : "—"}
                        </td>
                        <td className="py-2">
                          {isWinner ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                              Best
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Disk Scheduling Visualizer · FCFS · SSTF · SCAN · C-SCAN · LOOK · C-LOOK
        </footer>
      </div>
    </main>
  );
}
