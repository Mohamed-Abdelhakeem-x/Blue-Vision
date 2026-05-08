"use client";

import {motion} from "framer-motion";
import {Flag, Microscope} from "lucide-react";
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {useMemo, useState} from "react";
import Image from "next/image";

import {BentoTile} from "@/components/ui/bento-tile";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

const mockHeatmap = [
  {day: "Mon", severity: 3},
  {day: "Tue", severity: 5},
  {day: "Wed", severity: 4},
  {day: "Thu", severity: 7},
  {day: "Fri", severity: 6},
  {day: "Sat", severity: 4},
  {day: "Sun", severity: 2}
];

const domainSamples = [
  "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?q=80&w=1200",
  "https://images.unsplash.com/photo-1515150144380-bca9f1650ed9?q=80&w=1200",
  "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=1200"
];

export function ExpertDashboard() {
  const [suggestedLabel, setSuggestedLabel] = useState("Tomato___Early_blight");
  const [flagged, setFlagged] = useState(false);

  const severityScore = useMemo(() => {
    const total = mockHeatmap.reduce((acc, item) => acc + item.severity, 0);
    return (total / (mockHeatmap.length * 10)) * 100;
  }, []);

  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 font-mono md:grid-cols-2 xl:grid-cols-4">
      <motion.div initial={{opacity: 0, y: 14}} animate={{opacity: 1, y: 0}} className="md:col-span-2 xl:col-span-3">
        <BentoTile className="h-[24rem]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.16em] text-zinc-400">7-Day Disease Spread Heatmap</h2>
            <span className="text-xs text-[#C8E43B]">Severity {severityScore.toFixed(1)}%</span>
          </div>
          <ResponsiveContainer width="100%" height="86%">
            <BarChart data={mockHeatmap}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f24" />
              <XAxis dataKey="day" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip contentStyle={{background: "#09090b", border: "1px solid #1f1f24"}} />
              <Bar dataKey="severity" radius={[8, 8, 0, 0]} fill="#4DA751" />
            </BarChart>
          </ResponsiveContainer>
        </BentoTile>
      </motion.div>

      <motion.div initial={{opacity: 0, y: 14}} animate={{opacity: 1, y: 0}} transition={{delay: 0.04}} className="xl:col-span-1">
        <BentoTile className="h-[24rem]">
          <h3 className="text-xs uppercase tracking-[0.16em] text-zinc-500">Annotation Module</h3>
          <p className="mt-3 text-sm text-zinc-300">Flag false positives and propose corrected labels.</p>
          <Input
            value={suggestedLabel}
            onChange={(event) => setSuggestedLabel(event.target.value)}
            className="mt-4 border-[#1f1f24] bg-black/20 font-mono text-xs"
          />
          <Button onClick={() => setFlagged((prev) => !prev)} className="mt-3 w-full">
            <Flag className="mr-2 h-4 w-4" />
            {flagged ? "Flagged for dataset" : "Flag false positive"}
          </Button>
          <div className="mt-4 rounded-xl border border-[#1f1f24] bg-black/20 p-3 text-xs text-zinc-400">
            <p>Reviewer: Expert #A-13</p>
            <p>Confidence drift: +4.7%</p>
            <p>Suggested label: {suggestedLabel}</p>
          </div>
        </BentoTile>
      </motion.div>

    </section>
  );
}
