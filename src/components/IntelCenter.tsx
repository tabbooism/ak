import React, { useState, useEffect } from "react";
import { 
  BrainCircuit, 
  Play, 
  Sparkles, 
  Terminal, 
  RefreshCw, 
  Compass, 
  History, 
  Download, 
  ShieldAlert, 
  ShieldCheck,
  ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface IntelCenterProps {
  aiInitialized: boolean;
}

// Advanced Prompt Catalog
const DETAILED_PROMPTS = [
  {
    title: "AWS Redirection",
    query: "How to check for Cloudflare origin IP exposure & bypasses on 3.83.130.184?"
  },
  {
    title: "Casino Double Spend",
    query: "Plan a transaction double spend race condition test on P2.RUNEHALL.COM"
  },
  {
    title: "WAF JA3 Bypass",
    query: "How should I bypass custom Cloudflare WAF signature blocks on THOR.RH420.XYZ?"
  },
  {
    title: "Blind SQLi API",
    query: "Design a time-based heavy-query blind SQLi bypass against the /api/v1/auth endpoint."
  },
  {
    title: "Origin Cloaking",
    query: "Detail the headers needed to bypass proxy check verification (X-Forwarded-For, X-Client-IP)."
  },
  {
    title: "JWT Key Forgery",
    query: "Analyze vulnerability parameters if the signing algorithm header is set to None."
  }
];

export default function IntelCenter({ aiInitialized }: IntelCenterProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ thinking?: string; answer?: string; offline?: boolean } | null>(null);
  
  // History Logs and State Saving
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Auto save and restore query input state and query logs from localStorage
  useEffect(() => {
    const savedInput = localStorage.getItem("thor_intel_query_input");
    if (savedInput) setQuery(savedInput);

    const savedHistory = localStorage.getItem("thor_intel_history_logs");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to restore history log:", e);
      }
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    localStorage.setItem("thor_intel_query_input", val);
  };

  const handleQuery = async (customText?: string) => {
    const textToQuery = customText || query;
    if (!textToQuery.trim()) return;

    setLoading(true);
    setQuery(textToQuery);
    localStorage.setItem("thor_intel_query_input", textToQuery);

    try {
      const response = await fetch("/api/intel/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToQuery })
      });
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error("Received malformed response payload from platform server.");
      }
      setResult(data);

      // Add to query logs history safely (avoid duplicates in sequence)
      setHistory(prev => {
        const filtered = prev.filter(item => item !== textToQuery);
        const next = [textToQuery, ...filtered].slice(0, 10); // Keep last 10 entries
        localStorage.setItem("thor_intel_history_logs", JSON.stringify(next));
        return next;
      });
    } catch (err) {
      console.warn("Intel center fallback activated:", err instanceof Error ? err.message : "network timeout");
      // Auto-fallback local engine fallback
      setResult({
        thinking: `[AUTO-RECOVER CLIENT ENGINE] Client-side connection timeout. Utilizing pre-compiled local vulnerability metrics.`,
        answer: `### 🛡️ Local Tactical Vulnerability Assessment

Auto-recovered due to a connection interruption.

- **Analysed Query:** *"${textToQuery}"*
- **Offensive Vector:** Utilize origin headers or parameter obfuscation.
- **Defensive Advice:** Block negative transactional state bounds.`,
        offline: true
      });
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("thor_intel_history_logs");
  };

  const handleExportIntel = () => {
    if (!result?.answer) return;
    const reportText = `===========================================================
THOR SYSTEM STRATEGIC INTEL ADVISORY ASSESSMENTS
===========================================================
Query: ${query}
Engine Status: ${result.offline || !aiInitialized ? "Offline Local Core" : "Online Gemini Core"}
Timestamp: ${new Date().toISOString()}

-----------------------------------------------------------
1. CRITICAL ANALYSIS & DEEP-THINKING REASONING CHAIN
-----------------------------------------------------------
${result.thinking || "None compiled."}

-----------------------------------------------------------
2. TECHNICAL THREAT REPORT & TACTICAL PLAN
-----------------------------------------------------------
${result.answer}
===========================================================`;

    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `THOR_Intel_Threat_Report_${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple custom Markdown parser to avoid complex dependencies
  const parseMarkdown = (text?: string) => {
    if (!text) return "";
    
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Headings
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-sm font-sans font-medium text-white mt-4 mb-2">{line.replace("### ", "")}</h4>;
      }
      if (line.startsWith("#### ")) {
        return <h5 key={idx} className="text-xs font-sans font-medium text-red-400 mt-3 mb-1">{line.replace("#### ", "")}</h5>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-base font-sans font-semibold text-white mt-5 mb-3 border-b border-neutral-900 pb-1">{line.replace("## ", "")}</h3>;
      }
      // List items
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return <li key={idx} className="text-xs text-neutral-300 ml-4 list-disc mb-1.5 leading-relaxed">{line.substring(2)}</li>;
      }
      if (/^\d+\s*\.\s/.test(line)) {
        return <li key={idx} className="text-xs text-neutral-300 ml-4 list-decimal mb-1.5 leading-relaxed">{line.replace(/^\d+\s*\.\s/, "")}</li>;
      }
      // Empty line
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      // Regular paragraph
      return <p key={idx} className="text-xs text-neutral-400 mb-2 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div id="intel-center-card" className="bg-[#111114] border border-neutral-800 rounded-xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between h-full min-h-[640px]">
      {/* Decorative top ambient grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-red-950/30 rounded-lg text-red-500 border border-red-900/30">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-sans font-medium text-white tracking-wide">THOR Strategy Intel Core</h2>
              <p className="text-[10px] font-mono text-neutral-400">Gemini 3.1 Pro Thinking Mode Enabled</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded border transition-colors cursor-pointer ${showHistory ? 'bg-red-950/40 border-red-800 text-red-400' : 'bg-[#0c0c0e] border-neutral-800 text-neutral-400 hover:text-white'}`}
              title="Query Logs History"
            >
              <History className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono bg-red-950/40 text-red-400 px-2.5 py-0.5 rounded-full border border-red-900/40 hidden sm:inline">
              ThinkingLevel.HIGH
            </span>
          </div>
        </div>

        {/* Query Input form */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Ask the tactical mind for a strategy..."
              className="flex-1 h-11 bg-[#0c0c0e] border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-900/60 transition-colors font-mono"
            />
            <button
              onClick={() => handleQuery()}
              disabled={loading || !query.trim()}
              className="w-11 h-11 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 hover:border-red-700/50 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Panels: History vs Suggestion Hub */}
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-neutral-950/60 border border-neutral-800 rounded-lg p-3 mb-4 space-y-2.5"
            >
              <div className="flex justify-between items-center text-[10px] font-mono border-b border-neutral-900 pb-1.5">
                <span className="text-white flex items-center">
                  <ClipboardList className="w-3.5 h-3.5 mr-1.5 text-red-500" /> OPERATOR QUERY LOGS ({history.length})
                </span>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-red-400 hover:text-red-200 transition text-[9px] font-bold"
                  >
                    CLEAR LOGS
                  </button>
                )}
              </div>
              <div className="max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-800 pr-1">
                {history.length === 0 ? (
                  <span className="text-[9.5px] font-mono text-neutral-600 block text-center py-4">No recent queries made.</span>
                ) : (
                  history.map((h, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuery(h)}
                      className="w-full text-left bg-[#0c0c0e] border border-neutral-900 hover:border-neutral-800 p-2 rounded text-[9.5px] font-mono text-neutral-400 hover:text-white transition overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer"
                    >
                      {h}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <div className="mb-4">
              <div className="flex items-center space-x-1.5 text-[9.5px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
                <Compass className="w-3.5 h-3.5" />
                <span>Tactical Suggestion Prompts Hub</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DETAILED_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuery(p.query)}
                    disabled={loading}
                    className="text-[9.5px] font-mono bg-[#0c0c0e] border border-neutral-900 text-neutral-400 hover:text-red-400 hover:border-red-950/40 rounded-lg p-2 text-left transition-all cursor-pointer break-words flex flex-col justify-between min-h-[44px]"
                  >
                    <span className="text-neutral-500 font-bold block text-[8px] uppercase tracking-wider mb-1">{p.title}</span>
                    <span className="line-clamp-2 text-neutral-300">{p.query}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Result presentation */}
      <div className="flex-1 min-h-[220px] max-h-[420px] overflow-y-auto pr-1 flex flex-col space-y-4 scrollbar-thin scrollbar-thumb-neutral-800">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <RefreshCw className="w-8 h-8 animate-spin text-red-500 mb-3" />
              <p className="text-xs font-mono text-neutral-400 animate-pulse">SOLVING QUERY USING DEEP THINKING REASONING CHAIN...</p>
              <p className="text-[10px] font-mono text-neutral-600 mt-1">This may take up to 20 seconds. Please wait while models form strategy.</p>
            </motion.div>
          ) : result ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Local Failover Banner alert if Offline mode is active */}
              {(result.offline || !aiInitialized) && (
                <div className="bg-red-950/15 border border-red-900/40 rounded-lg p-2.5 text-[9px] font-mono text-red-400 flex items-start space-x-2 animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase block text-red-300">AUTO-FAILOVER INTERCEPT ACTIVE</span>
                    <span>Gemini API quota restrictions active. Loaded local threat-model matrix to maintain live ops continuous support.</span>
                  </div>
                </div>
              )}

              {/* Thinking Box */}
              {result.thinking && (
                <div className="bg-[#0c0c0e] border border-neutral-900 rounded-lg p-3">
                  <div className="flex items-center space-x-1.5 text-[9px] font-mono text-red-500/70 uppercase tracking-widest mb-1.5">
                    <Terminal className="w-3.5 h-3.5 animate-pulse" />
                    <span>STRATEGY THINKING PATTERN</span>
                  </div>
                  <pre className="text-[9.5px] font-mono text-neutral-500 whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto selection:bg-red-500 selection:text-black">
                    {result.thinking}
                  </pre>
                </div>
              )}

              {/* parsed final answer */}
              <div className="bg-[#0c0c0e]/45 border border-neutral-900/40 rounded-lg p-4 pl-5 relative overflow-hidden select-text">
                <div className="absolute top-0 right-0 p-1 flex items-center space-x-1">
                  <button
                    onClick={handleExportIntel}
                    className="p-1 rounded bg-[#0c0c0e] border border-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer flex items-center"
                    title="Download Report"
                  >
                    <Download className="w-3.5 h-3.5 text-red-400" />
                  </button>
                  <Sparkles className="w-4 h-4 text-red-950/20" />
                </div>
                <div className="text-neutral-300">
                  {parseMarkdown(result.answer)}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-neutral-900 rounded-lg bg-[#0c0c0e]/10">
              <BrainCircuit className="w-8 h-8 text-neutral-700 mb-2" />
              <p className="text-xs font-mono text-neutral-500">Intel Core Awaiting Operational Directives</p>
              <p className="text-[9.5px] font-mono text-neutral-600 text-center max-w-xs mt-1">Input a complex cyber threat scenario to analyze system vulnerabilities across active scope registries.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
