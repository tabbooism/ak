export interface Target {
  id: string;
  host: string;
  type: "IP" | "Domain";
  addedAt: string;
}

export interface ApprovalRequest {
  id: string;
  module: string;
  target: string;
  risk: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "DESTRUCTIVE";
  riskValue: number;
  payload: string;
  impact: string;
  status: "pending" | "approved" | "denied" | "scheduled";
  timestamp: string;
}

export interface TokenElevator {
  level: number;
  hourlyLimit: number;
  tokensSpent: number;
  banked: number;
  successes: number;
  lastProgress: string;
}

export interface ExploitModule {
  id: string;
  name: string;
  category: string;
  risk: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "DESTRUCTIVE";
  riskValue: number;
  description: string;
}

export interface ScanLog {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "finding";
  module: string;
  target: string;
  message: string;
}

export interface Finding {
  id: string;
  timestamp: string;
  module: string;
  target: string;
  risk: string;
  details: {
    payload: string;
    responseSnippet?: string;
    vulnerability: string;
    remediation: string;
  };
}

export interface AppState {
  targets: Target[];
  approvals: ApprovalRequest[];
  autoApprove: boolean;
  elevator: TokenElevator;
  modules: ExploitModule[];
  scanLogs: ScanLog[];
  findings: Finding[];
  activeScanTarget: string | null;
  isScanning: boolean;
  scanProgress: number;
  discordWebhookUrl: string;
  aiInitialized: boolean;
  adminActive: boolean;
}
