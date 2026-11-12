import React, { useState, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { Target } from "../types";
import { Target as TargetIcon, Plus, Trash2, Globe, ShieldAlert, Download, Activity, Zap, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TargetManagerProps {
  targets: Target[];
  onAddTarget: (host: string) => void;
  onRemoveTarget: (id: string) => void;
}

// D3 Sparkline Component for individual target nodes
function D3Sparkline({ data, color = "#ef4444", width = 100, height = 26 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);

  // D3 Scales
  const xScale = d3.scaleLinear().domain([0, data.length - 1]).range([2, width - 2]);
  const yScale = d3.scaleLinear().domain([Math.max(0, min - 5), max + 5]).range([height - 2, 2]);

  // D3 Line Generator
  const lineGen = d3.line<number>()
    .x((_, i) => xScale(i))
    .y((d) => yScale(d))
    .curve(d3.curveMonotoneX);

  const pathD = lineGen(data) || "";

  // D3 Area Generator
  const areaGen = d3.area<number>()
    .x((_, i) => xScale(i))
    .y0(height)
    .y1((d) => yScale(d))
    .curve(d3.curveMonotoneX);

  const areaD = areaGen(data) || "";

  const lastVal = data[data.length - 1];
  const lastX = xScale(data.length - 1);
  const lastY = yScale(lastVal);
  const gradId = useMemo(() => `spark-grad-${Math.random().toString(36).substr(2, 6)}`, []);

  // Determine health status color based on latency
  const statusColor = lastVal < 35 ? "#10b981" : lastVal < 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex items-center space-x-2 shrink-0">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={statusColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={statusColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={statusColor} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={lastX} cy={lastY} r="2.5" fill={statusColor} className="animate-pulse" />
      </svg>
      <span className="text-[10px] font-mono text-neutral-300 font-semibold w-10 text-right shrink-0">
        {lastVal}ms
      </span>
    </div>
  );
}

export default function TargetManager({ targets, onAddTarget, onRemoveTarget }: TargetManagerProps) {
  const [newHost, setNewHost] = useState("");
  const [error, setError] = useState("");
  const [showLatencyOverview, setShowLatencyOverview] = useState(true);

  // Latency trend series stored per host ID
  const [latencyHistory, setLatencyHistory] = useState<Record<string, number[]>>({});

  // Seed or update simulated live latency trends for active target nodes
  useEffect(() => {
    setLatencyHistory(prev => {
      const next = { ...prev };
      targets.forEach(target => {
        if (!next[target.id]) {
          // Generate initial 8 latency data points based on host characteristics
          const isIp = target.type === "IP";
          const baseLatency = isIp ? 18 : 32;
          const points = Array.from({ length: 8 }, (_, i) => {
            const jitter = Math.sin(i * 1.5 + target.id.charCodeAt(0)) * 12 + (Math.random() * 8 - 4);
            return Math.max(12, Math.round(baseLatency + jitter));
          });
          next[target.id] = points;
        }
      });
      return next;
    });
  }, [targets]);

  // Periodic latency ping simulation (jittering active node latencies live every 3s)
  useEffect(() => {
    const timer = setInterval(() => {
      setLatencyHistory(prev => {
        const next = { ...prev };
        let updated = false;
        targets.forEach(target => {
          if (next[target.id] && next[target.id].length > 0) {
            const currentSeries = [...next[target.id]];
            const lastVal = currentSeries[currentSeries.length - 1];
            const jitter = Math.round((Math.random() - 0.48) * 8);
            const newVal = Math.max(10, Math.min(180, lastVal + jitter));
            next[target.id] = [...currentSeries.slice(1), newVal];
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [targets]);

  // Calculate average latency across all active registry nodes
  const averageLatency = useMemo(() => {
    const currentLatencies = targets
      .map(t => latencyHistory[t.id]?.[latencyHistory[t.id]?.length - 1])
      .filter((v): v is number => typeof v === "number");
    if (currentLatencies.length === 0) return 0;
    return Math.round(currentLatencies.reduce((a, b) => a + b, 0) / currentLatencies.length);
  }, [targets, latencyHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHost.trim()) return;

    // Basic validation
    const clean = newHost.trim();
    if (targets.some(t => t.host.toLowerCase() === clean.toLowerCase())) {
      setError("Target already exists in registry.");
      return;
    }

    onAddTarget(clean);
    setNewHost("");
    setError("");
  };

  const handleExportCSV = () => {
    if (targets.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,ID,HOST,TYPE,ADDED_AT,LATENCY_MS\n";
    targets.forEach(t => {
      const id = t.id;
      const host = t.host.replace(/"/g, '""');
      const type = t.type;
      const addedAt = new Date(t.addedAt).toISOString();
      const series = latencyHistory[t.id] || [];
      const currentLatency = series[series.length - 1] || 0;
      csvContent += `"${id}","${host}","${type}","${addedAt}","${currentLatency}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `thor_targets_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (targets.length === 0) return;
    const exportPayload = targets.map(t => ({
      ...t,
      currentLatencyMs: latencyHistory[t.id]?.[latencyHistory[t.id]?.length - 1] || null,
      latencyHistory: latencyHistory[t.id] || []
    }));
    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `thor_targets_registry_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDossier = () => {
    const dossierData = {
      backupTimestamp: new Date().toISOString(),
      generator: "THOR RED OPS COMMAND CENTER v4.0",
      classification: "SECRET // SECURE TARGET INFRASTRUCTURE DOSSIER",
      targetsCount: targets.length,
      averageLatencyMs: averageLatency,
      dossierMeta: {
        clearanceLevel: "ADMINISTRATIVE FORCE OVERRIDE",
        operationName: "FULL KILLCHAIN ENUMERATION RANGE",
        zoneClassification: "CRITICAL WEB ASSETS & DMZ DM-NODES"
      },
      targets: targets.map(t => ({
        id: t.id,
        host: t.host,
        type: t.type,
        addedAt: t.addedAt,
        latencyMs: latencyHistory[t.id]?.[latencyHistory[t.id]?.length - 1] || 0,
        latencyTrend: latencyHistory[t.id] || [],
        networkZone: t.type === "IP" ? "EXTERIOR HOST INTERFACE" : "PUBLIC RECON GATEWAY",
        exploitAvenues: [
          "Origin Exposure Diagnostics via DNS resolv mapping",
          "Advanced WAF bypass via JA3 fingerprint rotation",
          "Blind Parameter Injection on database entrypoints"
        ],
        defenseActionItems: [
          "Sanitize query variables matching direct regex filters ('|--|UNION|SELECT|SLEEP).",
          "Restrict absolute host headers to prevent host-header poisoning."
        ]
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dossierData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `thor_target_registry_dossier_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="target-manager-card" className="bg-[#111114] border border-neutral-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
      {/* Visual cyber mesh pattern in background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4 relative z-10 gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 bg-red-950/30 rounded-lg text-red-500 border border-red-900/30 shrink-0">
            <TargetIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-sans font-medium text-white tracking-wide truncate">Target Server Registry</h2>
            <p className="text-[10px] font-mono text-neutral-400 truncate">Preloaded Active Scope Nodes with Real-Time Latency Tracking</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowLatencyOverview(prev => !prev)}
            className={`text-[10px] font-mono px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1 border ${
              showLatencyOverview
                ? "bg-red-950/40 border-red-800 text-red-400"
                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
            }`}
            title="Toggle D3 Latency Sparkline Matrix"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">D3 Latency</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="text-[10px] font-mono bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-red-400 border border-neutral-800 hover:border-red-950 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
            title="Download target registry as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="text-[10px] font-mono bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-red-400 border border-neutral-800 hover:border-red-950 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
            title="Download target registry as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={handleExportDossier}
            className="text-[10px] font-mono bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-red-400 border border-neutral-800 hover:border-red-950 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
            title="Export full target dossier backup to JSON file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Dossier</span>
          </button>
          <span className="text-[10px] font-mono bg-red-950/40 text-red-400 px-2 py-0.5 rounded-full border border-red-900/40">
            {targets.length} Nodes
          </span>
        </div>
      </div>

      {/* Latency Matrix Summary Banner */}
      <AnimatePresence>
        {showLatencyOverview && targets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#09090b] border border-neutral-800/80 rounded-lg p-3 mb-4 relative z-10 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-red-400 text-xs font-mono">
                <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span className="font-semibold uppercase tracking-wide">ACTIVE SCOPE LATENCY AGGREGATE</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">
                Avg Latency: <strong className="text-emerald-400">{averageLatency}ms</strong>
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-[10px] font-mono text-neutral-400">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>&lt;35ms (Optimal)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>35-70ms (Moderate)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                <span>&gt;70ms (Degraded)</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Target input form */}
      <form onSubmit={handleSubmit} className="mb-4 relative z-10">
        <div className="flex flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newHost}
              onChange={(e) => setNewHost(e.target.value)}
              placeholder="e.g. staging.rh420.xyz"
              className="w-full h-10 bg-[#0c0c0e] border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-900/60 transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            className="h-10 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 hover:border-red-700/50 rounded-lg px-4 flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span className="text-xs font-mono">Scope</span>
          </button>
        </div>
        {error && (
          <p className="text-[10px] text-red-500 mt-1.5 font-mono flex items-center">
            <ShieldAlert className="w-3 h-3 mr-1" /> {error}
          </p>
        )}
      </form>

      {/* Targets List with D3 Sparklines */}
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 relative z-10 scrollbar-thin scrollbar-thumb-neutral-800">
        <AnimatePresence initial={false}>
          {targets.map((target) => {
            const series = latencyHistory[target.id] || [25, 22, 28, 24, 21, 26, 23, 22];
            return (
              <motion.div
                key={target.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center justify-between bg-[#0c0c0e] border border-neutral-900/80 rounded-lg p-2.5 hover:border-neutral-800 transition-all group min-h-[52px]"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                  <div className={`p-1.5 rounded shrink-0 ${target.type === "IP" ? "bg-blue-950/20 text-blue-400 border border-blue-950" : "bg-purple-950/20 text-purple-400 border border-purple-950"}`}>
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-neutral-200 truncate tracking-wide selection:bg-red-500 selection:text-black">
                      {target.host}
                    </p>
                    <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest truncate">
                      {target.type} • ADDED {new Date(target.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* D3 Sparkline latency trend visualization */}
                <div className="flex items-center space-x-2">
                  <D3Sparkline data={series} width={100} height={24} />

                  {/* Visible always on touch devices, and on hover on desktops */}
                  <button
                    onClick={() => onRemoveTarget(target.id)}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 w-9 h-9 md:w-7 md:h-7 flex items-center justify-center text-neutral-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all cursor-pointer shrink-0"
                    title="Remove node from active scan range"
                  >
                    <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {targets.length === 0 && (
          <div className="text-center py-6 border border-dashed border-neutral-900 rounded-lg">
            <p className="text-xs font-mono text-neutral-500">No active scope nodes loaded.</p>
          </div>
        )}
      </div>
    </div>
  );
}

