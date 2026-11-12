import React from "react";
import { TokenElevator } from "../types";
import { Zap, ShieldCheck, TrendingUp, Sparkles, AlertCircle } from "lucide-react";

interface TokenElevatorMonitorProps {
  elevator: TokenElevator;
}

export default function TokenElevatorMonitor({ elevator }: TokenElevatorMonitorProps) {
  const percentSpent = Math.min(100, Math.floor((elevator.tokensSpent / elevator.hourlyLimit) * 100));

  // Determine indicator colors
  const getIndicatorColor = (percent: number) => {
    if (percent > 85) return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    if (percent > 60) return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
    return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
  };

  return (
    <div id="token-elevator-card" className="bg-[#111114] border border-neutral-800 rounded-xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between h-full">
      {/* Mesh and glowing background details */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-24 h-24 bg-red-900/5 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-red-950/30 rounded-lg text-red-500 border border-red-900/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-sans font-medium text-white tracking-wide">AI Token Elevator</h2>
              <p className="text-[10px] font-mono text-neutral-400">Demand-Driven Resource Allocator</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 bg-red-950/25 border border-red-900/30 px-3 py-1 rounded-lg">
            <span className="text-[10px] font-mono text-red-400 font-semibold uppercase tracking-widest">LEVEL {elevator.level} / 10</span>
          </div>
        </div>

        {/* Visual status blocks */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#0c0c0e] border border-neutral-900 rounded-lg p-3">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">HOURLY ALLOCATION</span>
            <span className="text-sm font-mono text-white font-semibold">
              {elevator.hourlyLimit.toLocaleString()} <span className="text-[10px] text-neutral-400 font-normal">TOK</span>
            </span>
          </div>
          <div className="bg-[#0c0c0e] border border-neutral-900 rounded-lg p-3">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">ROLLOVER BANKED</span>
            <span className="text-sm font-mono text-emerald-400 font-semibold">
              +{elevator.banked.toLocaleString()} <span className="text-[10px] text-neutral-500 font-normal">TOK</span>
            </span>
          </div>
          <div className="bg-[#0c0c0e] border border-neutral-900 rounded-lg p-3">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">TOKENS CONSUMED</span>
            <span className="text-sm font-mono text-red-400 font-semibold">
              {elevator.tokensSpent.toLocaleString()} <span className="text-[10px] text-neutral-500 font-normal">TOK</span>
            </span>
          </div>
          <div className="bg-[#0c0c0e] border border-neutral-900 rounded-lg p-3">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">SUCCESS REWARDS</span>
            <span className="text-sm font-mono text-amber-400 font-semibold flex items-center">
              {elevator.successes} <TrendingUp className="w-3.5 h-3.5 ml-1.5 text-amber-500" />
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-1.5">
            <span>CONSUMPTION DEPLETION RATE</span>
            <span className={percentSpent > 85 ? "text-red-400 font-bold" : "text-neutral-300"}>{percentSpent}% Spent</span>
          </div>
          <div className="w-full bg-[#0c0c0e] border border-neutral-900 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getIndicatorColor(percentSpent)}`}
              style={{ width: `${percentSpent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Narrative Footer */}
      <div className="bg-[#0c0c0e] border border-neutral-900 p-3 rounded-lg flex items-start space-x-2.5">
        <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[9.5px] font-mono text-neutral-400 leading-relaxed">
          <span className="text-white font-semibold">ADAPTIVE AGGRESSION:</span> Finding vulnerabilities triggers elevator upgrades, multiplying token budgets by 1.5x per level. Idle status conserve tokens, promoting stealth and endurance.
        </p>
      </div>
    </div>
  );
}
