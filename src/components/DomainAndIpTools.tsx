import React, { useState, useMemo } from "react";
import {
  generateDomainSuggestions,
  isValidIP,
  inspectIP,
  DEFAULT_TLDS,
  DomainSuggestion,
} from "../utils/domainAndIpTools";
import { Globe, ShieldCheck, ShieldAlert, Copy, Check, Plus, Search, RefreshCw, Cpu, Layers } from "lucide-react";

interface DomainAndIpToolsProps {
  onAddTarget?: (host: string) => void;
}

export default function DomainAndIpTools({ onAddTarget }: DomainAndIpToolsProps) {
  // Domain Generator State
  const [keywordInput, setKeywordInput] = useState("rune, hall");
  const [selectedTlds, setSelectedTlds] = useState<string[]>([".com", ".org", ".net", ".io", ".xyz"]);
  const [includeHyphens, setIncludeHyphens] = useState(true);
  const [includeSuffixes, setIncludeSuffixes] = useState(true);
  const [includePrefixes, setIncludePrefixes] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  // IP Validator State
  const [ipInput, setIpInput] = useState("3.83.130.184");
  const [copiedIp, setCopiedIp] = useState(false);

  // Parse keywords
  const keywords = useMemo(() => {
    return keywordInput
      .split(/[, \s]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }, [keywordInput]);

  // Compute suggestions
  const suggestions = useMemo(() => {
    return generateDomainSuggestions(keywords, {
      tlds: selectedTlds,
      includeHyphens,
      includePrefixes,
      includeSuffixes,
      maxResults: 30,
    });
  }, [keywords, selectedTlds, includeHyphens, includePrefixes, includeSuffixes]);

  // Curated 5 prime examples for 'rune' and 'hall'
  const featuredExamples = useMemo(() => {
    return [
      { domain: "runehall.com", tld: ".com", type: "Primary Brand (.com)", note: "Direct concatenation of base keywords" },
      { domain: "runehall.org", tld: ".org", type: "Foundation / Governance (.org)", note: "Non-profit or organizational identity" },
      { domain: "runehall.net", tld: ".net", type: "Network Infrastructure (.net)", note: "Core network node and gateway" },
      { domain: "rune-hall.io", tld: ".io", type: "Developer / Cloud Tech (.io)", note: "Hyphenated modern tech stack alias" },
      { domain: "runehallsec.xyz", tld: ".xyz", type: "Web3 / Red Ops Lab (.xyz)", note: "Compound with 'sec' security suffix" },
    ];
  }, []);

  // IP inspection results
  const ipReport = useMemo(() => {
    return inspectIP(ipInput);
  }, [ipInput]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(text);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  const handleToggleTld = (tld: string) => {
    setSelectedTlds((prev) =>
      prev.includes(tld) ? prev.filter((t) => t !== tld) : [...prev, tld]
    );
  };

  // Pre-configured test cases for quick one-click IP validation demonstrations
  const exampleIps = [
    { ip: "3.83.130.184", label: "AWS EC2 Target", type: "valid-ipv4", note: "Valid public IPv4 in active scope" },
    { ip: "192.168.1.1", label: "Private Gateway", type: "valid-ipv4", note: "Valid standard RFC 1918 IPv4" },
    { ip: "2001:0db8:85a3::8a2e:0370:7334", label: "IPv6 Compressed", type: "valid-ipv6", note: "Valid IPv6 with '::' zero-compression" },
    { ip: "::1", label: "IPv6 Loopback", type: "valid-ipv6", note: "Valid compact loopback address" },
    { ip: "256.100.0.1", label: "Out of Bounds", type: "invalid", note: "Invalid: 256 exceeds max 255 octet" },
    { ip: "192.168.01.1", label: "Leading Zero", type: "invalid", note: "Invalid: '01' has illegal leading zero" },
    { ip: "2001::85a3::7334", label: "Dual '::'", type: "invalid", note: "Invalid: multiple '::' compressions" },
  ];

  return (
    <div className="bg-[#111114] border border-neutral-900 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Header */}
      <div className="border-b border-neutral-900 px-5 py-4 bg-[#0d0d10] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-red-950/20 border border-red-900/40 flex items-center justify-center text-red-500">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-sans font-medium text-white tracking-wider uppercase">
              DOMAIN SUGGESTION ENGINE & IP VALIDATION SUITE
            </h2>
            <p className="text-[10px] font-mono text-neutral-400">
              Keyword permutations, TLD expansion (.com, .org, .net, etc.) & strict IPv4/IPv6 verification
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-mono text-neutral-400">
          <span className="bg-red-950/40 border border-red-900/40 text-red-400 px-2 py-0.5 rounded">
            RECON UTILITY
          </span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Domain Name Suggestion Tool (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5 text-red-400" />
              <h3 className="text-[11px] font-mono font-semibold text-neutral-200 uppercase tracking-wider">
                Keyword Domain Generator
              </h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">
              {suggestions.length} variations generated
            </span>
          </div>

          {/* Keyword Input & Controls */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-neutral-400 uppercase flex justify-between">
              <span>Keywords (comma or space separated)</span>
              <button
                type="button"
                onClick={() => setKeywordInput("rune, hall")}
                className="text-red-400 hover:text-red-300 text-[9px] underline cursor-pointer"
              >
                Reset to 'rune, hall'
              </button>
            </label>
            <div className="relative">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="e.g. rune, hall"
                className="w-full bg-[#08080a] border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:border-red-900 focus:outline-none"
              />
            </div>
          </div>

          {/* TLD Selection Checkboxes */}
          <div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1.5">
              Target TLD Variations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_TLDS.map((tld) => {
                const active = selectedTlds.includes(tld);
                return (
                  <button
                    key={tld}
                    type="button"
                    onClick={() => handleToggleTld(tld)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono transition cursor-pointer border ${
                      active
                        ? "bg-red-950/60 border-red-800 text-red-300 font-bold"
                        : "bg-[#08080a] border-neutral-800 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {tld}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modifier Flags */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] font-mono text-neutral-400">
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHyphens}
                onChange={(e) => setIncludeHyphens(e.target.checked)}
                className="rounded border-neutral-800 text-red-600 focus:ring-0 bg-[#08080a]"
              />
              <span>Hyphenated</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSuffixes}
                onChange={(e) => setIncludeSuffixes(e.target.checked)}
                className="rounded border-neutral-800 text-red-600 focus:ring-0 bg-[#08080a]"
              />
              <span>Industry Suffixes (sec, ops, hub)</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includePrefixes}
                onChange={(e) => setIncludePrefixes(e.target.checked)}
                className="rounded border-neutral-800 text-red-600 focus:ring-0 bg-[#08080a]"
              />
              <span>Brand Prefixes (get, my, cyber)</span>
            </label>
          </div>

          {/* FEATURED: 5 Example Suggestions for 'rune' & 'hall' */}
          <div className="border border-red-950/60 bg-red-950/15 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wide">
                ⭐ 5 Highlighted Examples for 'rune' + 'hall'
              </span>
              <span className="text-[9px] font-mono text-neutral-500">Core Prompt Output</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {featuredExamples.map((ex, idx) => (
                <div
                  key={ex.domain}
                  className="bg-[#08080a] border border-neutral-800 hover:border-red-900/60 rounded p-2 flex items-center justify-between text-xs font-mono transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-white font-bold flex items-center space-x-1.5 truncate">
                      <span className="text-neutral-500 text-[10px]">{idx + 1}.</span>
                      <span className="truncate">{ex.domain}</span>
                    </div>
                    <div className="text-[9px] text-neutral-400 truncate">{ex.type}</div>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(ex.domain)}
                      title="Copy Domain"
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    >
                      {copiedDomain === ex.domain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    {onAddTarget && (
                      <button
                        type="button"
                        onClick={() => onAddTarget(ex.domain)}
                        title="Add to Active Target Scope"
                        className="p-1 rounded bg-red-950/40 hover:bg-red-900/50 text-red-400 hover:text-white text-[9px] flex items-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generated Suggestions List */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-neutral-400 uppercase">
              All Generated Suggestions ({suggestions.length})
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
              {suggestions.map((s) => (
                <div
                  key={s.domain}
                  className="flex items-center justify-between bg-[#08080a] border border-neutral-900 hover:border-neutral-800 px-2.5 py-1.5 rounded transition group"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-white font-medium truncate">{s.domain}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                      {s.pattern}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(s.domain)}
                      className="text-neutral-500 hover:text-neutral-300 text-[10px] p-1"
                      title="Copy domain"
                    >
                      {copiedDomain === s.domain ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    {onAddTarget && (
                      <button
                        type="button"
                        onClick={() => onAddTarget(s.domain)}
                        className="text-[9px] text-red-400 hover:text-red-200 bg-red-950/30 hover:bg-red-950/60 px-1.5 py-0.5 rounded border border-red-900/30 flex items-center space-x-0.5 cursor-pointer"
                        title="Add to Active Scope"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Scope</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: IP Address Validator (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4 border-t lg:border-t-0 lg:border-l border-neutral-900 lg:pl-6 pt-4 lg:pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-red-400" />
              <h3 className="text-[11px] font-mono font-semibold text-neutral-200 uppercase tracking-wider">
                IP Address Validator
              </h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">IPv4 & IPv6 Standards</span>
          </div>

          {/* Live Validation Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-neutral-400 uppercase">
              Target IP Address Input
            </label>
            <div className="relative">
              <input
                type="text"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                placeholder="e.g. 192.168.1.1 or 2001:db8::1"
                className="w-full bg-[#08080a] border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:border-red-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Validation Status Badge */}
          <div
            className={`border rounded-lg p-3 transition ${
              ipReport.isValid
                ? "bg-emerald-950/20 border-emerald-900/50"
                : "bg-red-950/20 border-red-900/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {ipReport.isValid ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                )}
                <div>
                  <div
                    className={`text-xs font-mono font-bold uppercase ${
                      ipReport.isValid ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {ipReport.isValid ? `VALID ${ipReport.version}` : "INVALID IP ADDRESS"}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400">
                    {ipReport.isValid
                      ? `Conforms strictly to RFC ${ipReport.version === "IPv4" ? "791" : "4291"} standards`
                      : ipReport.reason || "Fails IPv4 and IPv6 format requirements"}
                  </div>
                </div>
              </div>

              {ipReport.isValid && onAddTarget && (
                <button
                  type="button"
                  onClick={() => onAddTarget(ipInput.trim())}
                  className="bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-emerald-300 text-[10px] font-mono px-2 py-1 rounded flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add IP</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Test Examples */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-neutral-400 uppercase block">
              Quick Test Cases (Valid & Invalid)
            </span>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {exampleIps.map((ex) => (
                <button
                  key={ex.ip}
                  type="button"
                  onClick={() => setIpInput(ex.ip)}
                  className={`w-full text-left p-2 rounded border transition text-[10px] font-mono cursor-pointer ${
                    ipInput === ex.ip
                      ? "bg-neutral-800 border-neutral-700"
                      : "bg-[#08080a] border-neutral-900 hover:border-neutral-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">{ex.ip}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                        ex.type.includes("valid")
                          ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/40"
                          : "bg-red-950/50 text-red-400 border border-red-900/40"
                      }`}
                    >
                      {ex.label}
                    </span>
                  </div>
                  <div className="text-neutral-500 text-[9px] mt-0.5">{ex.note}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Validation Logic Rules Box */}
          <div className="bg-[#08080a] border border-neutral-900 rounded-lg p-2.5 text-[10px] font-mono text-neutral-400 space-y-1">
            <div className="text-neutral-300 font-semibold uppercase text-[9px]">Validation Rules:</div>
            <div>• <strong className="text-neutral-200">IPv4:</strong> 4 octets, 0–255 each, no leading zeroes (e.g. 01 is rejected).</div>
            <div>• <strong className="text-neutral-200">IPv6:</strong> 8 groups of 1–4 hex digits, zero-compression <code className="text-red-400">::</code> permitted at most once.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
