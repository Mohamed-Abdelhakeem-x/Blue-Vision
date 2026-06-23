"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, ShieldAlert, Clock, Loader2, Sparkles } from "lucide-react";
import { getIncidents, resolveIncident } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface AlertItem {
  id: string;
  alert_type: string;
  message: string;
  created_at: string;
}

export function IncidentCenter({ triggerReload }: { triggerReload?: boolean }) {
  const [incidents, setIncidents] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadIncidents = async () => {
    try {
      const data = await getIncidents();
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    // Pull active incidents every 6 seconds
    const timer = setInterval(() => {
      loadIncidents();
    }, 6000);

    return () => clearInterval(timer);
  }, [triggerReload]);

  const handleResolve = async (id: string) => {
    try {
      setResolvingId(id);
      await resolveIncident(id);
      setIncidents((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-850 dark:bg-zinc-900/60 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-150 pb-3 dark:border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500 animate-pulse" />
            Smart Alert & Incident Center
          </h3>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Chronological feed of high-priority operational anomalies</p>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-550 dark:text-amber-400 animate-pulse">
          {incidents.length} active
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
          <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
          <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-300">All Ponds Operating Normally</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">No critical AI alerts or sensor anomalies flagged.</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {incidents.map((incident) => {
              const isAi = incident.alert_type.toLowerCase().includes("ai");
              
              return (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition ${
                    isAi 
                      ? "border-red-500/20 bg-red-500/5 dark:bg-red-950/10 hover:border-red-500/30" 
                      : "border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/10 hover:border-amber-500/30"
                  }`}
                >
                  <div className="flex gap-2">
                    <div className="mt-0.5 shrink-0">
                      {isAi ? (
                        <Sparkles className="h-4 w-4 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {incident.alert_type}
                      </p>
                      <p className="text-xs leading-4 text-zinc-650 dark:text-zinc-300">{incident.message}</p>
                      <div className="flex items-center gap-1 text-[9px] text-zinc-500 dark:text-zinc-400">
                        <Clock className="h-3 w-3" />
                        {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleResolve(incident.id)}
                    disabled={resolvingId === incident.id}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition"
                  >
                    {resolvingId === incident.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Resolve"
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
