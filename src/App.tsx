import React, { useState, useEffect } from "react";
import { AppState } from "./types";
import TargetManager from "./components/TargetManager";
import ApprovalGate from "./components/ApprovalGate";
import TokenElevatorMonitor from "./components/TokenElevatorMonitor";
import PayloadGenerator from "./components/PayloadGenerator";
import IntelCenter from "./components/IntelCenter";
import ScanEngine from "./components/ScanEngine";
import GoogleDriveManager from "./components/GoogleDriveManager";
import DomainAndIpTools from "./components/DomainAndIpTools";
import { ShieldCheck, ShieldAlert, Zap, Globe, Compass, RefreshCw, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // Poll state from full-stack server
  const fetchState = async () => {
    try {
      const response = await fetch("/api/state");
      if (!response.ok) {
        throw new Error("Failed to communicate with Server-Side Red Ops Controller.");
      }
      const responseText = await response.text();
      try {
        const data = JSON.parse(responseText) as AppState;
        setState(data);
        setError(null);
      } catch (parseErr) {
        throw new Error("Received malformed response from platform server. Retrying connection...");
      }
    } catch (err: any) {
      console.warn("API request notice:", err?.message || err);
      setError(err.message || "Connection lost to server daemon.");
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey })
      });
      if (res.ok) {
        const data = await res.json();
        setAdminMessage(data.message === "MONALISA_FORCE_OVERRIDE_ARMED" ? "Bypass Armed Successfully!" : "Bypass Disarmed.");
        setAdminKey("");
        fetchState();
        setTimeout(() => setAdminMessage(null), 3500);
      } else {
        const data = await res.json();
        setAdminMessage(data.error || "Override Denied.");
        setTimeout(() => setAdminMessage(null), 3500);
      }
    } catch (err) {
      console.warn("API request notice:", err instanceof Error ? err.message : err);
      setAdminMessage("Connection error.");
      setTimeout(() => setAdminMessage(null), 3500);
    }
  };

  const handleAddTarget = async (host: string) => {
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host })
      });
      if (res.ok) fetchState();
    } catch (err) {
      console.warn("API request notice:", err instanceof Error ? err.message : err);
    }
  };

  const handleRemoveTarget = async (id: string) => {
    try {
      const res = await fetch(`/api/targets/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchState();
    } catch (err) {
      console.warn("API request notice:", err instanceof Error ? err.message : err);
    }
  };

  const handleToggleAutoApprove = async () => {
    try {
      const res = await fetch("/api/approvals/toggle-auto", {
        method: "POST"
      });
      if (res.ok) fetchState();
    } catch (err) {
      console.warn("API request notice:", err instanceof Error ? err.message : err);
    }
  };

  const handleApprovalAction = async (id: string, action: "approve" | "deny" | "schedule") => {
    try {
      const res = await fetch(`/api/approvals/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) fetchState();
    } catch (err) {
      console.warn("API request notice:", err instanceof Error ? err.message : err);
    }
  };

  const handleStartScan = async (target: string, moduleIds: string[]) => {
    try {
      const res = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, moduleIds })
      });
      if (res.ok) fetchState();
    } catch (err) {
      console.warn("API request notice:", err instanceof Error ? err.message : err);
    }
  };

  const handleStopScan = async () => {
    try {
      const res = await fetch("/api/scan/stop", {
        method: "POST"
      });
      if (res.ok) fetchState();
    } catch (err) {
      console.warn("API request notice:", err instanceof Error ? err.message : err);
    }
  };

  const handleClearScan = async () => {
    try {
      const res = await fetch("/api/scan/clear", {
        method: "POST"
      });
      if (res.ok) fetchState();
    } catch (err) {
      console.warn("API request notice:", err instanceof Error ? err.message : err);
    }
  };

  const handleUpdateDiscordWebhook = async (url: string) => {
    try {
      const res = await fetch("/api/settings/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (res.ok) fetchState();
    } catch (err) {
      console.warn("API request notice:", err instanceof Error ? err.message : err);
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Subtle glowing sphere background to match aesthetic */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(239,68,68,0.05),transparent_70%)] pointer-events-none" />
        
        <div className="bg-[#111114] border border-neutral-900 p-6 rounded-xl max-w-sm w-full shadow-2xl relative overflow-hidden z-10">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/30 animate-pulse" />
          
          <div className="relative mb-5 flex justify-center">
            <div className="w-12 h-12 rounded-xl bg-red-950/20 border border-red-900/40 flex items-center justify-center text-red-500 font-mono font-bold text-lg tracking-tighter">
              T
            </div>
            <div className="absolute -inset-1 rounded-xl bg-red-500/10 blur-sm animate-pulse" />
          </div>

          <h2 className="text-xs font-sans font-medium text-white tracking-wider uppercase mb-1">CONNECTING TO THOR NETWORK</h2>
          <p className="text-[10px] font-mono text-neutral-400 mb-5">Initializing controller protocols and loading system metrics...</p>
          
          {error ? (
            <div className="border border-red-950/40 bg-red-950/10 rounded-lg p-3 text-left font-mono text-[10px] text-red-400 leading-relaxed">
              <div className="flex items-center space-x-1.5 mb-1 text-red-500 font-bold uppercase text-[9px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>DAEMON STATUS: RETRYING</span>
              </div>
              <p>{error}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2 text-[10px] font-mono text-neutral-500 py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
              <span>Checking Node 3000 link...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-neutral-300 pb-12 selection:bg-red-500 selection:text-black">
      {/* Absolute top grid background details */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.04),transparent)] pointer-events-none" />

      {/* Control Panel Header */}
      <header className="border-b border-neutral-900 bg-[#0c0c0e]/85 backdrop-blur sticky top-0 z-30 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-red-950/20 border border-red-900/40 flex items-center justify-center text-red-500 font-mono font-bold text-sm tracking-tighter shrink-0 mt-0.5 sm:mt-0">
              T
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xs sm:text-sm font-sans font-medium tracking-wider text-white uppercase">THOR RED OPS PLATFORM</h1>
                <span className="text-[9px] font-mono bg-red-950/50 text-red-400 px-1.5 py-0.5 rounded border border-red-900/30">
                  X10 v4.0
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] font-mono text-neutral-400">Autonomous Penetration Sequence & Payload Customizer</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Admin Override Controller */}
            <form onSubmit={handleAdminOverride} className="flex items-center space-x-1.5 bg-[#08080a] border border-neutral-800 rounded-lg p-1 text-[9px] sm:text-[10px] font-mono">
              <input
                type="password"
                placeholder="Admin Key..."
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="bg-transparent border-0 outline-none text-white placeholder-neutral-600 px-2 py-0.5 w-20 sm:w-28 text-[9px] sm:text-[10px] focus:ring-0 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-red-950/40 text-red-400 hover:bg-red-900/50 hover:text-red-200 border border-red-900/30 rounded px-2 py-0.5 font-medium transition cursor-pointer"
              >
                APPLY
              </button>
            </form>

            {/* Glowing Bypass State Badge */}
            {state.adminActive ? (
              <div className="flex items-center space-x-1.5 bg-red-950/30 border border-red-500/60 text-red-400 font-bold uppercase rounded-lg px-2.5 py-1 text-[9px] sm:text-[10px] font-mono animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span>BYPASS ENGAGED</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-[#08080a] border border-neutral-800 text-neutral-500 font-semibold uppercase rounded-lg px-2.5 py-1 text-[9px] sm:text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-700"></span>
                <span>SECURED</span>
              </div>
            )}

            {adminMessage && (
              <span className="text-[9px] font-mono text-red-400 animate-pulse transition">
                {adminMessage}
              </span>
            )}

            {/* Server-Side Key Status indicator (visible now on all viewports, simplified) */}
            <div className="flex items-center space-x-1.5 bg-[#08080a] border border-neutral-800 rounded-lg px-2.5 py-1 text-[9px] sm:text-[10px] font-mono">
              <span className="text-neutral-500 uppercase hidden sm:inline">INTEL ENGINE:</span>
              {state.aiInitialized ? (
                <div className="flex items-center text-emerald-400 font-semibold uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> ACTIVE
                </div>
              ) : (
                <div className="flex items-center text-amber-400 font-semibold uppercase">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" /> SIMULATED
                </div>
              )}
            </div>

            {/* Total scope nodes display */}
            <div className="flex items-center space-x-1.5 bg-[#08080a] border border-neutral-800 rounded-lg px-2.5 py-1 text-[9px] sm:text-[10px] font-mono">
              <Globe className="w-3.5 h-3.5 text-red-500" />
              <span className="text-neutral-400 font-semibold uppercase">{state.targets.length} NODES</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Bento Grid Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Row 1: Target Registry + Token Elevator + Security Approvals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-stretch">
          {/* Target Registry */}
          <div>
            <TargetManager
              targets={state.targets}
              onAddTarget={handleAddTarget}
              onRemoveTarget={handleRemoveTarget}
            />
          </div>

          {/* AI Token Elevator */}
          <div>
            <TokenElevatorMonitor elevator={state.elevator} />
          </div>

          {/* Active Security Approvals */}
          <div>
            <ApprovalGate
              approvals={state.approvals}
              autoApprove={state.autoApprove}
              onToggleAutoApprove={handleToggleAutoApprove}
              onHandleAction={handleApprovalAction}
            />
          </div>
        </div>

        {/* Row 2: Scanner Core Terminal Logs & Findings Grid */}
        <div className="mb-6">
          <ScanEngine
            targets={state.targets}
            modules={state.modules}
            scanLogs={state.scanLogs}
            findings={state.findings}
            isScanning={state.isScanning}
            scanProgress={state.scanProgress}
            activeScanTarget={state.activeScanTarget}
            discordWebhookUrl={state.discordWebhookUrl}
            onStartScan={handleStartScan}
            onStopScan={handleStopScan}
            onClearScan={handleClearScan}
            onUpdateDiscordWebhook={handleUpdateDiscordWebhook}
          />
        </div>

        {/* Row 3: Custom Payload Builder + Strategy Intel Core */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mb-6">
          {/* Custom Payload Generator */}
          <div>
            <PayloadGenerator aiInitialized={state.aiInitialized} />
          </div>

          {/* Strategic Intel Mind (Gemini HIGH Thinking Mode) */}
          <div>
            <IntelCenter aiInitialized={state.aiInitialized} />
          </div>
        </div>

        {/* Row 4: Domain Generator & IP Address Validator Recon Suite */}
        <div className="mb-6">
          <DomainAndIpTools onAddTarget={handleAddTarget} />
        </div>

        {/* Row 5: Google Drive Workspace Management */}
        <div className="mb-6">
          <GoogleDriveManager />
        </div>
      </main>

      {/* Command Panel humble footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-neutral-900 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-mono text-neutral-500">
        <div>
          <span>THOR RED OPS COMMAND CENTER • SYSTEM PROTOCOL X10 ACTIVE</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>UTC CLOCK: {new Date().toISOString().replace("T", " ").substring(0, 19)}</span>
          <span>OPERATOR ASSIGNED</span>
        </div>
      </footer>

      {/* Floating Status Warning Toast - Non-disruptive, Fixed placement prevents layout shifts and scrolling */}
      {error && (
        <div id="reconnect-hud-toast" className="fixed bottom-6 right-6 z-50 bg-[#111114]/95 backdrop-blur-md border border-red-950 p-4 rounded-xl shadow-2xl max-w-sm flex items-start space-x-3 text-left animate-pulse">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-600" />
          <div className="p-1.5 rounded-lg bg-red-950/20 border border-red-900/40 text-red-500 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-sans font-medium text-white tracking-wider uppercase">CONNECTION LOSS</h4>
            <p className="text-[10px] font-mono text-neutral-400 mt-1 leading-relaxed">
              Express server daemon unreachable. Displaying cached system state continuous monitoring metrics.
            </p>
            <div className="flex items-center space-x-1.5 mt-2.5 text-[9px] font-mono text-neutral-500">
              <RefreshCw className="w-3 h-3 animate-spin text-red-500" />
              <span>Retrying Node 3000 connection...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
