import React from "react";
import { ApprovalRequest } from "../types";
import { ShieldAlert, Check, X, Clock, HelpCircle, ShieldCheck, ToggleLeft, ToggleRight, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ApprovalGateProps {
  approvals: ApprovalRequest[];
  autoApprove: boolean;
  onToggleAutoApprove: () => void;
  onHandleAction: (id: string, action: "approve" | "deny" | "schedule") => void;
}

export default function ApprovalGate({ approvals, autoApprove, onToggleAutoApprove, onHandleAction }: ApprovalGateProps) {
  
  // Helper to color risk badges
  const getRiskStyles = (risk: string) => {
    switch (risk) {
      case "DESTRUCTIVE":
        return { bg: "bg-red-950/40", border: "border-red-900/50", text: "text-red-400", label: "DESTRUCTIVE [LVL 5]" };
      case "CRITICAL":
        return { bg: "bg-rose-950/30", border: "border-rose-900/40", text: "text-rose-400", label: "CRITICAL [LVL 4]" };
      case "HIGH":
        return { bg: "bg-orange-950/25", border: "border-orange-900/35", text: "text-orange-400", label: "HIGH RISK [LVL 3]" };
      case "MEDIUM":
        return { bg: "bg-amber-950/20", border: "border-amber-900/30", text: "text-amber-400", label: "MEDIUM [LVL 2]" };
      case "LOW":
        return { bg: "bg-blue-950/20", border: "border-blue-900/30", text: "text-blue-400", label: "LOW RISK [LVL 1]" };
      default:
        return { bg: "bg-neutral-900", border: "border-neutral-800", text: "text-neutral-400", label: "INFO [LVL 0]" };
    }
  };

  const pendingRequests = approvals.filter(a => a.status === "pending");

  const handleExportCSV = () => {
    if (approvals.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,ID,MODULE,TARGET,RISK,STATUS,TIMESTAMP,PAYLOAD,IMPACT\n";
    approvals.forEach(a => {
      const id = a.id;
      const mod = a.module.replace(/"/g, '""');
      const target = a.target.replace(/"/g, '""');
      const risk = a.risk;
      const status = a.status;
      const ts = a.timestamp;
      const payload = (a.payload || "").replace(/"/g, '""');
      const impact = (a.impact || "").replace(/"/g, '""');
      csvContent += `"${id}","${mod}","${target}","${risk}","${status}","${ts}","${payload}","${impact}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `thor_approval_requests_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (approvals.length === 0) return;
    const jsonStr = JSON.stringify(approvals, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `thor_approval_requests_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPayload = (req: ApprovalRequest) => {
    if (!req.payload) return;
    const blob = new Blob([req.payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sanitizedModule = req.module.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    link.download = `thor_approval_payload_${req.id}_${sanitizedModule}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="approval-gate-card" className="bg-[#111114] border border-neutral-800 rounded-xl p-5 shadow-xl relative overflow-hidden flex flex-col h-full">
      {/* Decorative cyber line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-amber-500 to-transparent opacity-80" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4 mb-4 relative z-10">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-amber-950/30 rounded-lg text-amber-500 border border-amber-900/30">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-sans font-medium text-white tracking-wide">Payload Approval Gate</h2>
            <p className="text-[10px] font-mono text-neutral-400">Autonomous Execution Safeguard Mechanism</p>
          </div>
        </div>

        {/* Auto Approve Toggle & Exports */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="text-[10px] font-mono bg-[#0c0c0e] hover:bg-neutral-850 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-950 px-2 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1"
            title="Download approval requests log as CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="text-[10px] font-mono bg-[#0c0c0e] hover:bg-neutral-850 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-950 px-2 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1"
            title="Download approval requests log as JSON"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={onToggleAutoApprove}
            className="flex items-center space-x-2 bg-[#0c0c0e] border border-neutral-800 rounded-lg px-3 py-1.5 hover:border-neutral-700 transition-colors cursor-pointer"
          >
            <span className="text-[10px] font-mono text-neutral-300">AUTO-APPROVE [LVL ≤2]:</span>
            {autoApprove ? (
              <div className="flex items-center text-emerald-500">
                <span className="text-[10px] font-mono mr-1.5 uppercase font-semibold">ON</span>
                <ToggleRight className="w-5 h-5" />
              </div>
            ) : (
              <div className="flex items-center text-neutral-500">
                <span className="text-[10px] font-mono mr-1.5 uppercase font-semibold">OFF</span>
                <ToggleLeft className="w-5 h-5" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Security Statement Banner */}
      <div className="bg-[#0c0c0e] border border-neutral-900 p-3 rounded-lg mb-4 flex items-start space-x-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
        <p className="text-[10px] font-mono text-neutral-400 leading-relaxed">
          <span className="text-white font-semibold">RULE GATE ACTIVE:</span> Payloads with risk parameters rated <span className="text-orange-400 font-semibold">HIGH</span>, <span className="text-rose-400 font-semibold">CRITICAL</span>, or <span className="text-red-400 font-semibold">DESTRUCTIVE</span> require direct tactical authorization. If denied, the active scanner skips the vector immediately.
        </p>
      </div>

      {/* List of pending intercept cards */}
      <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3 pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
        <AnimatePresence initial={false}>
          {pendingRequests.map((req) => {
            const style = getRiskStyles(req.risk);
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0c0c0e] border border-neutral-800 rounded-lg p-3.5 relative overflow-hidden group hover:border-neutral-700 transition-all"
              >
                {/* Lateral hazard indicator bar */}
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${req.risk === "DESTRUCTIVE" || req.risk === "CRITICAL" ? "bg-rose-500" : "bg-amber-500"}`} />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pl-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono text-neutral-500">REQ-{req.id}</span>
                      <span className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${style.bg} ${style.border} ${style.text}`}>
                        {style.label}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 truncate">
                        🎯 {req.target}
                      </span>
                    </div>
                    <h3 className="text-xs font-sans font-medium text-neutral-200 group-hover:text-white transition-colors">
                      {req.module}
                    </h3>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="flex items-center space-x-2 sm:space-x-1.5 sm:self-center shrink-0">
                    <button
                      onClick={() => handleExportPayload(req)}
                      className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center bg-neutral-900/40 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 border border-neutral-800/80 hover:border-red-950/80 rounded-lg transition-colors cursor-pointer"
                      title="Export Payload for Offline Review"
                    >
                      <Download className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-red-400/80" />
                    </button>
                    <button
                      onClick={() => onHandleAction(req.id, "approve")}
                      className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400 hover:text-emerald-300 border border-emerald-900/30 rounded-lg transition-colors cursor-pointer"
                      title="Authorize Injection"
                    >
                      <Check className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      onClick={() => onHandleAction(req.id, "deny")}
                      className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-900/30 rounded-lg transition-colors cursor-pointer"
                      title="Decline Injection"
                    >
                      <X className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      onClick={() => onHandleAction(req.id, "schedule")}
                      className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center bg-amber-950/30 hover:bg-amber-900/40 text-amber-400 hover:text-amber-300 border border-amber-900/30 rounded-lg transition-colors cursor-pointer"
                      title="Defer/Schedule (30m delay)"
                    >
                      <Clock className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Technical data foldout */}
                <div className="mt-3 bg-black/60 rounded border border-neutral-900 p-2.5 pl-3.5 text-[10px] font-mono relative overflow-hidden">
                  <div className="flex items-center justify-between text-neutral-500 mb-1 pb-1 border-b border-neutral-900/50">
                    <span>PROPOSED PAYLOAD:</span>
                    <button
                      type="button"
                      onClick={() => handleExportPayload(req)}
                      className="text-[9px] font-mono bg-neutral-950/80 hover:bg-neutral-900 text-neutral-400 hover:text-red-400 border border-neutral-850 hover:border-red-950/80 px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1"
                      title="Export specific payload mutation to a local text file"
                    >
                      <Download className="w-2.5 h-2.5 text-red-400" />
                      <span>Export Payload</span>
                    </button>
                  </div>
                  <div className="text-neutral-300 overflow-x-auto whitespace-pre pr-2 selection:bg-red-500 selection:text-black">
                    {req.payload}
                  </div>
                  <div className="text-neutral-500 mt-2 mb-0.5">ESTIMATED IMPACT:</div>
                  <div className="text-neutral-400 leading-relaxed">
                    {req.impact}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {pendingRequests.length === 0 && (
          <div className="text-center py-10 border border-dashed border-neutral-900 rounded-lg bg-[#0c0c0e]/30">
            <ShieldCheck className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-xs font-mono text-neutral-400">All Security Gates Cleared</p>
            <p className="text-[10px] font-mono text-neutral-600 mt-1">No pending high-risk payloads are awaiting operator approval.</p>
          </div>
        )}
      </div>
    </div>
  );
}
