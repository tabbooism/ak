import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Finding } from "../types";

interface BubbleNode {
  name: string;
  value: number;
  category: string;
  risk: string;
  findings: Finding[];
}

interface FindingsBubbleChartProps {
  findings: Finding[];
}

export default function FindingsBubbleChart({ findings }: FindingsBubbleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    title: string;
    count: number;
    category: string;
    risk: string;
  }>({
    show: false,
    x: 0,
    y: 0,
    title: "",
    count: 0,
    category: "",
    risk: "MEDIUM",
  });

  const prevSerializedRef = useRef<string>("");

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Map finding category prefixes based on the module string or generic categorization
    const mapCategory = (f: Finding): string => {
      const moduleName = f.module.toLowerCase();
      if (moduleName.includes("recon") || moduleName.includes("dns") || moduleName.includes("port") || moduleName.includes("whois")) {
        return "Recon & Port Scanner";
      }
      if (moduleName.includes("waf") || moduleName.includes("proxy") || moduleName.includes("ja3")) {
        return "WAF & Proxy Evasion";
      }
      if (moduleName.includes("directory") || moduleName.includes("crawler") || moduleName.includes("sifter") || moduleName.includes("endpoints") || moduleName.includes("span")) {
        return "Directory & Crawlers";
      }
      if (moduleName.includes("injection") || moduleName.includes("sql") || moduleName.includes("rce") || moduleName.includes("command")) {
        return "Input Injection Core";
      }
      if (moduleName.includes("auth") || moduleName.includes("access") || moduleName.includes("privilege")) {
        return "Auth & Access Flaws";
      }
      if (moduleName.includes("logical") || moduleName.includes("financial") || moduleName.includes("bet") || moduleName.includes("casino") || moduleName.includes("tamper")) {
        return "Logical & Financial Flaws";
      }
      return "General Vulnerabilities";
    };

    // Calculate a stable serialization key of current findings to prevent re-drawing same content
    const currentSerialized = JSON.stringify(findings.map(f => ({ id: f.id, module: f.module, risk: f.risk })));
    if (currentSerialized === prevSerializedRef.current) {
      // Data is functionally identical; skip DOM re-creation to maintain UI stability and hover persistence
      return;
    }
    prevSerializedRef.current = currentSerialized;

    // Remove any previous elements inside the SVG
    d3.select(svgRef.current).selectAll("*").remove();

    // Aggregate findings by unique module name
    const grouped = d3.group(findings, (f) => f.module.split(" [")[0]);
    const dataset: BubbleNode[] = Array.from(grouped, ([name, list]) => {
      const primaryFinding = list[0];
      const category = mapCategory(primaryFinding);
      return {
        name,
        value: list.length,
        category,
        risk: primaryFinding.risk || "MEDIUM",
        findings: list,
      };
    });

    const width = containerRef.current.clientWidth || 320;
    const height = 240;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("style", "max-width: 100%; height: auto;");

    // Color definitions for categories to match Thor theme
    const colorScale = d3.scaleOrdinal<string>()
      .domain([
        "Recon & Port Scanner",
        "WAF & Proxy Evasion",
        "Directory & Crawlers",
        "Input Injection Core",
        "Auth & Access Flaws",
        "Logical & Financial Flaws",
        "General Vulnerabilities",
      ])
      .range([
        "#38bdf8", // Sky blue for Recon
        "#a855f7", // Purple for WAF
        "#fb923c", // Amber for Directory
        "#f43f5e", // Rose for Injection
        "#10b981", // Emerald for Auth
        "#eab308", // Yellow for Logical
        "#94a3b8", // Slate for General
      ]);

    // Create D3 Pack Hierarchy
    const root = d3.hierarchy({ children: dataset })
      .sum((d: any) => d.value || 1);

    const pack = d3.pack()
      .size([width - 16, height - 16])
      .padding(4);

    pack(root as any);

    // Filter to leaves only
    const nodes = root.leaves();

    // If there are no findings, render a placeholder state or basic graphic
    if (dataset.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#52525b")
        .attr("font-family", "monospace")
        .attr("font-size", "10px")
        .text("Waiting for active penetrations to map findings density...");
      return;
    }

    const nodeElements = svg
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", (d: any) => `translate(${d.x + 8},${d.y + 8})`)
      .attr("class", "cursor-pointer group");

    // Node Circle (with subtle glows matching category color)
    nodeElements
      .append("circle")
      .attr("r", (d: any) => d.r)
      .attr("fill", (d: any) => {
        const baseColor = colorScale(d.data.category);
        return d3.color(baseColor)?.copy({ opacity: 0.15 }).toString() || "rgba(244,63,94,0.15)";
      })
      .attr("stroke", (d: any) => colorScale(d.data.category))
      .attr("stroke-width", 1.5)
      .attr("style", "transition: transform 0.2s ease-out, fill 0.2s ease-out;")
      .on("mouseover", function (event, d: any) {
        const baseColor = colorScale(d.data.category);
        d3.select(this)
          .attr("fill", d3.color(baseColor)?.copy({ opacity: 0.35 }).toString() || "rgba(244,63,94,0.35)")
          .attr("stroke-width", 2.5);

        // Tooltip updates
        const containerRect = containerRef.current?.getBoundingClientRect();
        const tooltipX = event.clientX - (containerRect?.left || 0);
        const tooltipY = event.clientY - (containerRect?.top || 0) - 45;

        setTooltip({
          show: true,
          x: tooltipX,
          y: tooltipY,
          title: d.data.name,
          count: d.data.value,
          category: d.data.category,
          risk: d.data.risk,
        });
      })
      .on("mousemove", function (event) {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const tooltipX = event.clientX - (containerRect?.left || 0);
        const tooltipY = event.clientY - (containerRect?.top || 0) - 45;
        setTooltip((prev) => ({
          ...prev,
          x: tooltipX,
          y: tooltipY,
        }));
      })
      .on("mouseout", function (event, d: any) {
        const baseColor = colorScale(d.data.category);
        d3.select(this)
          .attr("fill", d3.color(baseColor)?.copy({ opacity: 0.15 }).toString() || "rgba(244,63,94,0.15)")
          .attr("stroke-width", 1.5);

        setTooltip((prev) => ({ ...prev, show: false }));
      });

    // Add visual glowing center point
    nodeElements
      .append("circle")
      .attr("r", 2.5)
      .attr("fill", (d: any) => colorScale(d.data.category))
      .attr("class", "pointer-events-none");

    // Dynamic clean text labels inside larger bubbles
    nodeElements
      .filter((d: any) => d.r > 16)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "#f4f4f5")
      .attr("font-family", "monospace")
      .attr("font-size", (d: any) => `${Math.min(9, d.r / 3)}px`)
      .attr("class", "pointer-events-none font-semibold truncate select-none")
      .text((d: any) => {
        const countStr = `[${d.data.value}]`;
        const namePart = d.data.name.split(" ")[0] || "";
        return d.r > 28 ? `${namePart} ${countStr}` : countStr;
      });

  }, [findings]);

  // Handle auto-resizing
  useEffect(() => {
    const handleResize = () => {
      if (findings.length > 0) {
        // Force redraw on window resizing to make it beautifully responsive
        const svg = d3.select(svgRef.current);
        const width = containerRef.current?.clientWidth || 320;
        const height = 240;
        svg
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", `0 0 ${width} ${height}`);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [findings]);

  return (
    <div id="findings-bubble-chart-wrapper" className="relative w-full" ref={containerRef}>
      {/* Mini Color Legend */}
      {findings.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-2 px-1 border-b border-neutral-900 pb-2">
          <span className="text-[8.5px] font-mono text-neutral-500 uppercase">Interactive findings density map:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Recon", color: "bg-[#38bdf8]" },
              { label: "WAF", color: "bg-[#a855f7]" },
              { label: "Directory", color: "bg-[#fb923c]" },
              { label: "Injection", color: "bg-[#f43f5e]" },
              { label: "Auth", color: "bg-[#10b981]" },
              { label: "Logical", color: "bg-[#eab308]" },
            ].map((item) => (
              <div key={item.label} className="flex items-center space-x-1">
                <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                <span className="text-[8px] font-mono text-neutral-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bubble Canvas */}
      <div className="bg-[#050507] border border-neutral-900 rounded-lg overflow-hidden relative flex items-center justify-center p-2 min-h-[240px]">
        {findings.length > 0 && (
          <div className="absolute top-1.5 left-2 flex items-center space-x-1 pointer-events-none">
            <span className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
            <span className="text-[8px] font-mono text-neutral-500">D3 LIVE ANALYSIS ENGINE</span>
          </div>
        )}
        <svg ref={svgRef} className="z-10" />

        {/* Custom floating tactical tooltip inside sandbox */}
        {tooltip.show && (
          <div
            className="absolute bg-neutral-950/95 border border-neutral-800 rounded px-2.5 py-1.5 shadow-2xl z-20 pointer-events-none font-mono text-[9.5px] text-white flex flex-col space-y-1 backdrop-blur-sm max-w-[200px]"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: "translate(-50%, -100%)",
              transition: "left 0.05s ease-out, top 0.05s ease-out",
            }}
          >
            <div className="flex justify-between items-center border-b border-neutral-900 pb-1 gap-2">
              <span className="text-red-400 font-semibold truncate">{tooltip.title}</span>
              <span className="text-[8.5px] bg-red-950/55 border border-red-900/50 px-1 rounded text-red-300 font-bold">
                {tooltip.risk}
              </span>
            </div>
            <div className="flex justify-between text-[8.5px] text-neutral-400">
              <span>Category:</span>
              <span className="text-neutral-300 font-sans">{tooltip.category}</span>
            </div>
            <div className="flex justify-between text-[8.5px] text-neutral-400">
              <span>Threat Density:</span>
              <span className="text-emerald-400 font-bold">{tooltip.count} finding(s)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
