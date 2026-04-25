"use client";

import {motion} from "framer-motion";
import {Download, Server, Trash2} from "lucide-react";
import {useEffect, useMemo, useState} from "react";

import {BentoTile} from "@/components/ui/bento-tile";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

const teamMembers = ["Nagh", "Aya", "Hady", "Abd Elghany", "Ahmed Bahaa", "Omar Radwan"];

const auditRows = Array.from({length: 12}).map((_, index) => ({
  id: `scan-${index + 1}`,
  plant: index % 2 ? "Tomato" : "Potato",
  prediction: index % 3 ? "Early blight" : "Healthy",
  confidence: `${(92 - index * 2).toFixed(1)}%`
}));

export function AdminDashboard() {
  const [cpu, setCpu] = useState(41);
  const [ram, setRam] = useState(56);
  const [disk, setDisk] = useState(62);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCpu((prev) => Math.max(12, Math.min(89, prev + (Math.random() > 0.5 ? 2 : -2))));
      setRam((prev) => Math.max(20, Math.min(93, prev + (Math.random() > 0.5 ? 1 : -1))));
      setDisk((prev) => Math.max(35, Math.min(95, prev + (Math.random() > 0.8 ? 1 : 0))));
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  const serverTiles = useMemo(
    () => [
      {label: "CPU", value: cpu},
      {label: "RAM", value: ram},
      {label: "Disk", value: disk}
    ],
    [cpu, ram, disk]
  );

  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {serverTiles.map((tile, index) => (
        <motion.div key={tile.label} initial={{opacity: 0, y: 14}} animate={{opacity: 1, y: 0}} transition={{delay: index * 0.04}}>
          <BentoTile className="h-36">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{tile.label} usage</p>
            <p className="mt-2 text-3xl font-semibold text-white">{tile.value}%</p>
            <div className="mt-3 h-2 rounded bg-zinc-900">
              <span className="block h-full rounded bg-gradient-to-r from-[#4DA751] to-[#C8E43B]" style={{width: `${tile.value}%`}} />
            </div>
          </BentoTile>
        </motion.div>
      ))}

      <motion.div initial={{opacity: 0, y: 14}} animate={{opacity: 1, y: 0}} transition={{delay: 0.16}} className="md:col-span-2 xl:col-span-2">
        <BentoTile className="h-[20rem]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.16em] text-zinc-500">Team Delegation Board</h2>
            <Server className="h-4 w-4 text-[#C8E43B]" />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {teamMembers.map((member) => (
              <div key={member} className="rounded-xl border border-[#1f1f24] bg-black/20 p-3">
                <p className="text-sm text-white">{member}</p>
                <p className="text-xs text-zinc-500">Assigned: Monitor model drift</p>
              </div>
            ))}
          </div>
        </BentoTile>
      </motion.div>

      <motion.div initial={{opacity: 0, y: 14}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="md:col-span-2 xl:col-span-4">
        <BentoTile className="h-[24rem] overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.16em] text-zinc-500">SQLite Data Audit</h2>
            <div className="flex gap-2">
              <Button className="bg-[#09090b] text-zinc-200"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              <Button><Download className="mr-2 h-4 w-4" />Export</Button>
            </div>
          </div>
          <div className="h-[17rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scan ID</TableHead>
                  <TableHead>Plant</TableHead>
                  <TableHead>Prediction</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs text-zinc-300">{row.id}</TableCell>
                    <TableCell>{row.plant}</TableCell>
                    <TableCell>{row.prediction}</TableCell>
                    <TableCell className="font-mono text-xs">{row.confidence}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </BentoTile>
      </motion.div>
    </section>
  );
}
