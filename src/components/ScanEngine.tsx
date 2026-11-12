import React, { useState, useEffect, useRef } from "react";
import { ExploitModule, ScanLog, Finding, Target } from "../types";
import FindingsBubbleChart from "./FindingsBubbleChart";
import { 
  Terminal, 
  Shield, 
  Play, 
  Square, 
  Trash2, 
  Send, 
  ChevronRight, 
  CheckSquare, 
  Square as SquareIcon, 
  AlertTriangle, 
  Link2,
  Search,
  Filter,
  Download,
  Activity,
  CheckCircle,
  Globe,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ScanEngineProps {
  targets: Target[];
  modules: ExploitModule[];
  scanLogs: ScanLog[];
  findings: Finding[];
  isScanning: boolean;
  scanProgress: number;
  activeScanTarget: string | null;
  discordWebhookUrl: string;
  onStartScan: (target: string, moduleIds: string[]) => void;
  onStopScan: () => void;
  onClearScan: () => void;
  onUpdateDiscordWebhook: (url: string) => void;
}

export default function ScanEngine({
  targets,
  modules,
  scanLogs,
  findings,
  isScanning,
  scanProgress,
  activeScanTarget,
  discordWebhookUrl,
  onStartScan,
  onStopScan,
  onClearScan,
  onUpdateDiscordWebhook
}: ScanEngineProps) {
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [discordInput, setDiscordInput] = useState(discordWebhookUrl);
  const [showDiscordForm, setShowDiscordForm] = useState(false);

  // Advanced search & filtration state
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [portScanOverlay, setPortScanOverlay] = useState(false);
  const [scanningPorts, setScanningPorts] = useState(false);
  const [scannedPorts, setScannedPorts] = useState<{ port: number; service: string; status: string }[]>([]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const portScanIntervalRef = useRef<any>(null);

  // Clean up port scan interval on unmount
  useEffect(() => {
    return () => {
      if (portScanIntervalRef.current) {
        clearInterval(portScanIntervalRef.current);
      }
    };
  }, []);

  // Auto-restore target, selected modules, and configurations from localStorage
  useEffect(() => {
    if (targets.length > 0 && !selectedTarget) {
      const savedTarget = localStorage.getItem("thor_scan_selected_target");
      if (savedTarget && targets.some(t => t.host === savedTarget)) {
        setSelectedTarget(savedTarget);
      } else {
        setSelectedTarget(targets[0].host);
      }
    }

    const savedModules = localStorage.getItem("thor_scan_selected_modules");
    if (savedModules) {
      try {
        setSelectedModuleIds(JSON.parse(savedModules));
      } catch (e) {
        console.warn("Failed to restore selected module IDs:", e);
      }
    }
  }, [targets]);

  const handleTargetChange = (val: string) => {
    setSelectedTarget(val);
    localStorage.setItem("thor_scan_selected_target", val);
  };

  const handleModuleSelectionUpdate = (nextIds: string[]) => {
    setSelectedModuleIds(nextIds);
    localStorage.setItem("thor_scan_selected_modules", JSON.stringify(nextIds));
  };

  // Sync discord input prop
  useEffect(() => {
    setDiscordInput(discordWebhookUrl);
  }, [discordWebhookUrl]);

  // Collapsible Categories
  const categories = ["All", "Recon & Port Scanner", "WAF & Proxy Evasion", "Directory & Crawlers", "Input Injection Core", "Auth & Access Flaws", "Logical & Financial Flaws"];

  // Auto-scroll terminal logs strictly inside console block without moving document layout
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [scanLogs]);

  const handleSelectAll = () => {
    const allIds = modules.map(m => m.id);
    handleModuleSelectionUpdate(allIds);
  };

  const handleDeselectAll = () => {
    handleModuleSelectionUpdate([]);
  };

  const handleToggleCategoryModules = (cat: string) => {
    const catModuleIds = modules.filter(m => m.category === cat).map(m => m.id);
    const allSelected = catModuleIds.every(id => selectedModuleIds.includes(id));

    let nextIds: string[];
    if (allSelected) {
      nextIds = selectedModuleIds.filter(id => !catModuleIds.includes(id));
    } else {
      nextIds = Array.from(new Set([...selectedModuleIds, ...catModuleIds]));
    }
    handleModuleSelectionUpdate(nextIds);
  };

  const handleTriggerScan = () => {
    if (!selectedTarget) return;
    
    // Fallback: if no modules selected, select all as default
    const finalModuleIds = selectedModuleIds.length > 0 ? selectedModuleIds : modules.map(m => m.id);
    onStartScan(selectedTarget, finalModuleIds);
  };

  // Run interactive local port scan simulation
  const handlePortScanSimulation = () => {
    if (portScanIntervalRef.current) {
      clearInterval(portScanIntervalRef.current);
    }

    setScanningPorts(true);
    setScannedPorts([]);
    setPortScanOverlay(true);

    const standardPorts = [
      { port: 80, service: "HTTP (Nginx reverse-proxy)", status: "OPEN" },
      { port: 443, service: "HTTPS (Cloudflare TLS)", status: "OPEN" },
      { port: 3000, service: "Express C2 Platform Node", status: "OPEN (ACTIVE INGRESS)" },
      { port: 8080, service: "Internal Admin Portal", status: "FILTERED" },
      { port: 5432, service: "Cloud SQL PostgreSQL Instance", status: "FILTERED" },
      { port: 22, service: "SSH Secure Shell", status: "CLOSED" }
    ];

    let current = 0;
    portScanIntervalRef.current = setInterval(() => {
      if (current < standardPorts.length) {
        setScannedPorts(prev => [...prev, standardPorts[current]]);
        current++;
      } else {
        setScanningPorts(false);
        if (portScanIntervalRef.current) {
          clearInterval(portScanIntervalRef.current);
          portScanIntervalRef.current = null;
        }
      }
    }, 600);
  };

  // Exporters for registered findings
  const handleExportCSV = () => {
    if (findings.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,VULNERABILITY ID,TARGET NODE,EXPLOC MODULE,RISK SEVERITY,DISPATCHED PAYLOAD,REMEDIATION ACTION\n";
    findings.forEach(f => {
      const id = f.id;
      const target = f.target.replace(/"/g, '""');
      const mod = f.module.split(" [")[0].replace(/"/g, '""');
      const risk = f.risk;
      const payload = f.details.payload.replace(/"/g, '""');
      const remediation = f.details.remediation.replace(/"/g, '""');
      csvContent += `"${id}","${target}","${mod}","${risk}","${payload}","${remediation}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `THOR_Threat_Findings_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (findings.length === 0) return;
    const jsonStr = JSON.stringify(findings, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `THOR_Threat_Findings_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Comprehensive HTML Executive Threat Report Exporter
  const handleExportHTML = () => {
    if (findings.length === 0) return;
    
    let findingsRows = "";
    findings.forEach(f => {
      findingsRows += `
      <div style="background-color: #111114; border: 1px solid #331111; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; padding-bottom: 8px; margin-bottom: 10px;">
          <span style="font-family: monospace; font-size: 11px; color: #888;">ID: ${f.id} • ${f.timestamp}</span>
          <span style="background-color: #330000; color: #ff3333; font-weight: bold; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-family: monospace;">${f.risk} RISK</span>
        </div>
        <h3 style="margin: 0 0 8px 0; color: #fff; font-size: 15px;">${f.module}</h3>
        <p style="margin: 0 0 12px 0; color: #ff6666; font-size: 12px; font-family: monospace;">🎯 Host Node: ${f.target}</p>
        
        <div style="margin-top: 10px;">
          <strong style="color: #888; font-size: 10px; font-family: monospace; display: block; margin-bottom: 4px;">EXPLOT MUTATED PAYLOAD:</strong>
          <pre style="background-color: #050507; color: #ff4444; padding: 10px; border-radius: 4px; font-size: 11px; font-family: monospace; margin: 0; overflow-x: auto; border: 1px solid #1a0a0a;">${f.details.payload}</pre>
        </div>

        <div style="margin-top: 10px;">
          <strong style="color: #888; font-size: 10px; font-family: monospace; display: block; margin-bottom: 4px;">BLUE TEAM MITIGATION:</strong>
          <p style="color: #ccc; margin: 0; font-size: 12px; line-height: 1.5;">${f.details.remediation}</p>
        </div>
      </div>
      `;
    });

    const reportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>THOR Executive Penetration Report</title>
      <meta charset="utf-8">
      <style>
        body { background-color: #0c0c0e; color: #eee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; margin: 0; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #f43f5e; font-size: 28px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
        p.subtitle { color: #888; font-family: monospace; font-size: 12px; margin-top: 0; margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .stat-card { background-color: #16161a; border: 1px solid #222; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-val { font-size: 24px; font-weight: bold; color: #fff; font-family: monospace; }
        .stat-lbl { font-size: 11px; color: #888; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>THOR Red Ops Security Report</h1>
        <p class="subtitle">AUTONOMOUS PENETRATION SEQUENCE DIAGNOSTICS LOG • UTC ${new Date().toISOString()}</p>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-val" style="color: #f43f5e;">${findings.length}</div>
            <div class="stat-lbl">Identified Vulnerabilities</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" style="color: #10b981;">SECURED CLIENT</div>
            <div class="stat-lbl">Operational Status</div>
          </div>
        </div>

        <h2>Registered Exploit Findings Archive</h2>
        ${findingsRows}
      </div>
    </body>
    </html>
    `;

    const blob = new Blob([reportHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `THOR_Executive_Penetration_Report_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Perform filtering & search across active findings
  const filteredFindings = findings.filter(f => {
    const matchesSearch = 
      f.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.details.payload.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRisk = riskFilter === "ALL" || f.risk.toUpperCase() === riskFilter.toUpperCase();
    return matchesSearch && matchesRisk;
  });

  return (
    <div id="scan-engine-card" className="bg-[#111114] border border-neutral-800 rounded-xl p-5 shadow-xl relative overflow-hidden flex flex-col h-full justify-between min-h-[520px]">
      {/* Mesh Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-red-950/30 rounded-lg text-red-500 border border-red-900/30">
              <Terminal className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-sans font-medium text-white tracking-wide">Killchain Simulation Engine</h2>
              <p className="text-[10px] font-mono text-neutral-400">Autonomous Penetration Sequence Control Room</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Port Scan HUD Toggle Button */}
            <button
              onClick={handlePortScanSimulation}
              className="text-[10px] font-mono px-2.5 py-1.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 text-red-400 rounded-lg flex items-center space-x-1 cursor-pointer transition-all"
            >
              <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>Host Port Scan HUD</span>
            </button>

            {/* Webhook Button */}
            <div className="relative">
              <button
                onClick={() => setShowDiscordForm(!showDiscordForm)}
                className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 cursor-pointer transition-colors ${
                  discordWebhookUrl 
                    ? "bg-indigo-950/20 border-indigo-900/40 text-indigo-400" 
                    : "bg-[#0c0c0e] border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>C2 Discord Webhook</span>
              </button>

              {showDiscordForm && (
                <div className="absolute right-0 top-9 w-[calc(100vw-2.5rem)] sm:w-72 bg-[#16161a] border border-neutral-800 p-3 rounded-lg shadow-2xl z-20 max-w-sm">
                  <p className="text-[9.5px] font-mono text-neutral-400 mb-2">Configure Discord Webhook Integration</p>
                  <div className="flex gap-1.5">
                    <input
                      type="password"
                      value={discordInput}
                      onChange={(e) => setDiscordInput(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="flex-1 bg-[#0c0c0e] border border-neutral-800 rounded px-2 py-1.5 text-[10px] font-mono text-white focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        onUpdateDiscordWebhook(discordInput);
                        setShowDiscordForm(false);
                      }}
                      className="bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-400 border border-indigo-900/40 rounded px-3.5 text-[10px] font-mono cursor-pointer"
                    >
                      Set
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Port Scan HUD Overlay Modal */}
        <AnimatePresence>
          {portScanOverlay && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c0c0e] border border-red-900/35 rounded-xl p-4 mb-4 relative overflow-hidden"
            >
              <button 
                onClick={() => setPortScanOverlay(false)}
                className="absolute top-2 right-2 font-mono text-neutral-500 hover:text-white text-[10px] cursor-pointer"
              >
                [CLOSE]
              </button>
              <div className="flex items-center space-x-2 text-[10.5px] font-mono text-white mb-3 border-b border-neutral-900 pb-2">
                <Globe className="w-4 h-4 text-red-500 animate-spin" style={{ animationDuration: '6s' }} />
                <span>INTERACTIVE TARGET PORT SCANNER HUD & SERVICE DIGEST</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-mono text-neutral-400 mb-2">TARGET SCAN NODE HOST:</p>
                  <div className="bg-[#111114] border border-neutral-800 p-2.5 rounded-lg flex items-center justify-between text-xs font-mono">
                    <span className="text-red-400 font-bold">{selectedTarget}</span>
                    <button
                      onClick={handlePortScanSimulation}
                      disabled={scanningPorts}
                      className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded px-2.5 py-1 text-[9px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      {scanningPorts ? "SCANNING RANGE..." : "SCAN PORT TARGETS"}
                    </button>
                  </div>
                  <span className="text-[8.5px] text-neutral-500 font-mono mt-1.5 block">Dispatches low-risk SYN packet probes to establish service presence.</span>
                </div>
                <div className="bg-black/40 border border-neutral-900 rounded-lg p-2.5 font-mono text-[9.5px] max-h-[140px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800 space-y-1">
                  {scannedPorts.length === 0 ? (
                    <span className="text-neutral-600 block text-center py-4 italic">No active syn scan performed yet.</span>
                  ) : (
                    scannedPorts.map((p, index) => {
                      if (!p) return null;
                      return (
                        <div key={index} className="flex justify-between border-b border-neutral-900/35 pb-1">
                          <span className="text-neutral-400">PORT <strong className="text-red-400">{p.port ?? "N/A"}</strong>/tcp</span>
                          <span className="text-neutral-500 truncate max-w-[150px]">{p.service ?? "Unknown"}</span>
                          <span className={`font-bold ${(p.status && p.status.includes("OPEN")) ? "text-emerald-400" : "text-amber-500"}`}>{p.status ?? "FILTERED"}</span>
                        </div>
                      );
                    })
                  )}
                  {scanningPorts && <div className="text-red-400 animate-pulse text-center pt-2">LAUNCHING SEQUENTIAL SYN PACKETS...</div>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan controllers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Target Host selection */}
          <div>
            <label className="text-[10px] font-mono text-neutral-400 block mb-1 uppercase tracking-wider">Target Scope Node</label>
            <select
              value={selectedTarget}
              onChange={(e) => handleTargetChange(e.target.value)}
              disabled={isScanning}
              className="w-full h-10 bg-[#0c0c0e] border border-neutral-800 rounded-lg p-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-red-900/60 disabled:opacity-50 cursor-pointer"
            >
              {targets.map(t => (
                <option key={t.id} value={t.host}>{t.host} ({t.type})</option>
              ))}
            </select>
          </div>

          {/* Module checklist summary trigger */}
          <div className="md:col-span-2 flex flex-col justify-end">
            <div className="flex flex-wrap gap-2 sm:items-center">
              <button
                onClick={handleSelectAll}
                disabled={isScanning}
                className="text-[9.5px] font-mono bg-[#0c0c0e] border border-neutral-800 text-neutral-400 hover:text-white rounded px-2.5 py-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Select All 200+
              </button>
              <button
                onClick={handleDeselectAll}
                disabled={isScanning}
                className="text-[9.5px] font-mono bg-[#0c0c0e] border border-neutral-800 text-neutral-400 hover:text-white rounded px-2.5 py-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Clear Selections
              </button>
              <span className="text-[10px] font-mono text-neutral-500 py-1.5 ml-auto">
                {selectedModuleIds.length === 0 ? "Default All 200+" : `${selectedModuleIds.length} Modules Active`}
              </span>
            </div>
          </div>
        </div>

        {/* Categories checklist tabs */}
        <div className="mb-4 bg-[#0c0c0e]/30 border border-neutral-900 p-3 rounded-lg">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-2 uppercase tracking-wider">
            <span>Exploit Namespace Selectors</span>
            <span className="text-[9px] text-neutral-500">Toggle Categories to fast bulk toggle</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
            {categories.filter(c => c !== "All").map((cat, idx) => {
              const catCount = modules.filter(m => m.category === cat).length;
              const catSelectedCount = modules.filter(m => m.category === cat && selectedModuleIds.includes(m.id)).length;
              const isAllCatSelected = catSelectedCount === catCount;

              return (
                <button
                  key={idx}
                  onClick={() => handleToggleCategoryModules(cat)}
                  disabled={isScanning}
                  className={`text-[9.5px] font-mono px-2 py-1.5 border rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isAllCatSelected 
                      ? "bg-red-950/10 border-red-900/40 text-red-400" 
                      : catSelectedCount > 0 
                      ? "bg-neutral-900/45 border-neutral-800 text-neutral-300"
                      : "bg-[#0c0c0e] border-neutral-900 text-neutral-500 hover:border-neutral-800"
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  <span className="shrink-0 text-[8.5px] bg-black/40 px-1 py-0.5 rounded ml-1 text-neutral-400">
                    {catSelectedCount}/{catCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trigger Button & progress */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            {isScanning ? (
              <button
                onClick={onStopScan}
                className="flex-1 md:flex-initial bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 hover:border-rose-700/50 rounded-lg px-4 py-3 md:py-2.5 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-mono text-xs font-semibold tracking-wider h-11"
              >
                <Square className="w-4 h-4 text-rose-500 shrink-0" />
                <span>TERMINATE SEQUENCES</span>
              </button>
            ) : (
              <button
                onClick={handleTriggerScan}
                disabled={targets.length === 0}
                className="flex-1 md:flex-initial bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 hover:border-red-700/50 rounded-lg px-4 py-3 md:py-2.5 flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-mono text-xs font-semibold tracking-wider shadow-md h-11"
              >
                <Play className="w-4 h-4 text-red-500 animate-pulse shrink-0" />
                <span>INITIATE SEQUENCES</span>
              </button>
            )}

            <button
              onClick={onClearScan}
              className="p-3 md:p-2.5 bg-[#0c0c0e] border border-neutral-800 hover:border-neutral-700 text-neutral-400 rounded-lg transition-all cursor-pointer shrink-0 h-11 w-11 flex items-center justify-center"
              title="Clear terminal and findings logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Progress gauge */}
          <div className="w-full md:flex-1">
            <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-1">
              <span>SCAN PIPELINE POSITION</span>
              <span>{scanProgress}% Completed</span>
            </div>
            <div className="w-full bg-[#0c0c0e] border border-neutral-900 h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Real-time split screen console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-[300px]">
        {/* Terminal Screen (Console) */}
        <div className="lg:col-span-2 bg-[#050507] border border-neutral-900 rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden font-mono">
          <div className="absolute top-2 right-2 flex items-center space-x-1 text-[9px] text-neutral-600 uppercase tracking-widest pointer-events-none">
            <div className={`w-1.5 h-1.5 rounded-full ${isScanning ? "bg-red-500 animate-ping" : "bg-neutral-800"}`} />
            <span>THOR RED OPS TERMINAL</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[340px] space-y-1.5 text-[10px] text-neutral-300 scrollbar-thin scrollbar-thumb-neutral-900 pr-1">
            {scanLogs.length === 0 ? (
              <p className="text-neutral-600 italic">Console idle. Execute sequential scans to launch remote bypass streams...</p>
            ) : (
              scanLogs.map((log) => {
                let color = "text-neutral-400";
                let badge = "INFO";

                if (log.type === "success") {
                  color = "text-emerald-400";
                  badge = "OK";
                } else if (log.type === "warning") {
                  color = "text-amber-400";
                  badge = "WARN";
                } else if (log.type === "error") {
                  color = "text-red-500 font-bold";
                  badge = "HALT";
                } else if (log.type === "finding") {
                  color = "text-rose-400 font-bold animate-pulse";
                  badge = "FIND";
                }

                return (
                  <div key={log.id} className="leading-relaxed border-b border-neutral-900/30 pb-1">
                    <span className="text-neutral-600">[{log.timestamp.slice(11, 19)}]</span>{" "}
                    <span className={`font-semibold mr-1.5 text-[9.5px] px-1 py-0.5 bg-[#0a0a0c] border border-neutral-900/60 rounded ${color}`}>
                      {badge}
                    </span>{" "}
                    <span className="text-neutral-500 font-semibold truncate max-w-[120px] inline-block align-bottom">
                      [{log.module.split(" [")[0]}]
                    </span>{" "}
                    <span className="text-neutral-400">@ {log.target}</span>{" "}
                    <span className="text-neutral-300 block mt-0.5 ml-12 selection:bg-red-500 selection:text-black">
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Findings Tracker Card */}
        <div className="bg-[#050507] border border-neutral-900 rounded-lg p-3.5 flex flex-col justify-between font-mono">
          <div>
            {/* Header / Export Panel */}
            <div className="flex flex-col space-y-2 border-b border-neutral-900 pb-2.5 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-500" /> ACTIVE FINDINGS ARCHIVE
                </span>
                <span className="text-[9.5px] bg-red-950/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded">
                  {filteredFindings.length} DISCOVERIES
                </span>
              </div>
              
              {/* Export Trigger Row */}
              <div className="flex items-center justify-between text-[9px] text-neutral-500 border-t border-neutral-900/35 pt-2">
                <span>DOWNLOAD LOGS:</span>
                <div className="flex items-center space-x-1.5">
                  <button 
                    onClick={handleExportCSV} 
                    disabled={findings.length === 0}
                    className="text-[9.5px] font-mono bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-red-400 border border-neutral-800 hover:border-red-950 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Export CSV diagnostics"
                  >
                    <Download className="w-2.5 h-2.5 text-red-500" /> Export CSV
                  </button>
                  <button 
                    onClick={handleExportJSON} 
                    disabled={findings.length === 0}
                    className="text-[9.5px] font-mono bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-red-400 border border-neutral-800 hover:border-red-950 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Export raw JSON logs"
                  >
                    <Download className="w-2.5 h-2.5 text-red-500" /> Export JSON
                  </button>
                  <button 
                    onClick={handleExportHTML} 
                    disabled={findings.length === 0}
                    className="text-[9.5px] font-mono bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-red-400 border border-neutral-800 hover:border-red-950 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Export interactive HTML executive summary"
                  >
                    <Download className="w-2.5 h-2.5 text-red-500" /> HTML
                  </button>
                </div>
              </div>
            </div>

            {/* Density Bubble Map */}
            <div className="mb-4">
              <FindingsBubbleChart findings={findings} />
            </div>

            {/* Filter & Search Controls */}
            <div className="space-y-2 mb-3 bg-[#0c0c0e]/60 border border-neutral-900 p-2 rounded-lg">
              <div className="flex items-center bg-black/40 rounded px-2 py-1 border border-neutral-800">
                <Search className="w-3 h-3 text-neutral-500 mr-1.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search findings details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[9.5px] font-mono text-neutral-300 placeholder-neutral-600 w-full"
                />
              </div>

              {/* Risk Filter Checklist Row */}
              <div className="flex items-center justify-between text-[8px] text-neutral-400 font-mono">
                <span className="flex items-center"><Filter className="w-2.5 h-2.5 mr-1" /> RISK LEVEL:</span>
                <div className="flex space-x-1.5">
                  {["ALL", "HIGH", "MED", "INFO"].map((level) => (
                    <button
                      key={level}
                      onClick={() => setRiskFilter(level)}
                      className={`px-1 py-0.5 rounded border transition-colors cursor-pointer ${
                        riskFilter === level
                          ? "bg-red-950/45 border-red-800 text-red-400 font-bold"
                          : "bg-black/20 border-neutral-900 text-neutral-500 hover:text-neutral-400"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Render List */}
            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin scrollbar-thumb-neutral-900">
              {filteredFindings.map((fnd) => (
                <div key={fnd.id} className="bg-[#0c0c0e] border border-red-950/20 rounded p-2.5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-[8px] text-neutral-500 mb-1.5">
                    <span>{fnd.timestamp.slice(11, 19)}</span>
                    <span className="text-red-400 font-semibold font-mono bg-red-950/40 px-1 py-0.5 rounded border border-red-900/30">
                      {fnd.risk}
                    </span>
                  </div>
                  <h4 className="text-[10px] font-sans font-medium text-neutral-200 truncate mb-1">
                    {fnd.module.split(" [")[0]}
                  </h4>
                  <p className="text-[9px] text-neutral-400 truncate">
                    🎯 Host: {fnd.target}
                  </p>
                  
                  {/* Detailed disclosure */}
                  <div className="mt-2 pt-1.5 border-t border-neutral-900/60">
                    <span className="text-[8.5px] text-neutral-500 block">MUTATED INJECTION PAYLOAD:</span>
                    <code className="text-[9px] text-red-400/90 block truncate bg-black p-1 rounded font-mono select-all">
                      {fnd.details.payload}
                    </code>
                    <span className="text-[8.5px] text-neutral-500 block mt-1.5">MITIGATION COUNTER-MEASURE:</span>
                    <p className="text-[9px] text-neutral-400 leading-normal">
                      {fnd.details.remediation}
                    </p>
                  </div>
                </div>
              ))}

              {filteredFindings.length === 0 && (
                <div className="text-center py-12">
                  <Shield className="w-8 h-8 text-neutral-800 mx-auto mb-2" />
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">No matching threats logged</p>
                  <p className="text-[9px] text-neutral-600 mt-0.5">Adjust filter settings or execute sequential scans to capture node insights.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
