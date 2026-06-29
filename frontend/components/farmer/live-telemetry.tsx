"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Thermometer, Droplet, Wind, Loader2, Edit2, Check, X } from "lucide-react";
import { getTelemetry, getStoredRole, postTelemetry } from "@/lib/api";

interface TelemetryData {
  dissolved_oxygen: number;
  temperature: number;
  ph_level: number;
  limits: {
    do_optimal_min: number;
    do_optimal_max: number;
    temp_optimal_min: number;
    temp_optimal_max: number;
    ph_optimal_min: number;
    ph_optimal_max: number;
  };
}

export function LiveTelemetry({ pondId, onUpdated }: { pondId: string | null, onUpdated?: () => void }) {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [isManager, setIsManager] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    dissolved_oxygen: 6.2,
    temperature: 26.5,
    ph_level: 7.4
  });

  const fetchMetrics = async () => {
    if (!pondId) return;
    try {
      const res = await getTelemetry(pondId);
      setData(res);
      setFormData({
        dissolved_oxygen: res.dissolved_oxygen,
        temperature: res.temperature,
        ph_level: res.ph_level,
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setIsManager(getStoredRole() === "Farm Manager");
  }, []);

  useEffect(() => {
    if (!pondId) {
      setData(null);
      return;
    }

    setLoading(true);
    fetchMetrics().then(() => setLoading(false));
    
    // Polling removed as metrics are now manually inputted by Farm Managers.
  }, [pondId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pondId) return;
    try {
      setUpdating(true);
      await postTelemetry(pondId, formData);
      await fetchMetrics();
      setIsEditing(false);
      onUpdated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (!pondId) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center text-zinc-500">
        <p className="text-sm">Please select a pond from the dashboard above to link live sensor telemetry channels.</p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const m = data || {
    dissolved_oxygen: 6.2,
    temperature: 26.5,
    ph_level: 7.4,
    limits: {
      do_optimal_min: 5.0,
      do_optimal_max: 8.0,
      temp_optimal_min: 25.0,
      temp_optimal_max: 30.0,
      ph_optimal_min: 6.5,
      ph_optimal_max: 8.5
    }
  };

  const doIsCritical = m.dissolved_oxygen < m.limits.do_optimal_min || m.dissolved_oxygen > m.limits.do_optimal_max;
  const tempIsCritical = m.temperature < m.limits.temp_optimal_min || m.temperature > m.limits.temp_optimal_max;
  const phIsCritical = m.ph_level < m.limits.ph_optimal_min || m.ph_level > m.limits.ph_optimal_max;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-850 dark:bg-zinc-900/60 shadow-sm backdrop-blur relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-150 pb-3 dark:border-zinc-800 gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${doIsCritical || tempIsCritical || phIsCritical ? "bg-red-500" : "bg-emerald-500"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${doIsCritical || tempIsCritical || phIsCritical ? "bg-red-500" : "bg-emerald-500"}`}></span>
            </span>
            Pond Water Metrics
          </h3>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Latest recorded pond metrics</p>
        </div>
        
        <div className="flex items-center gap-2">
          {isManager && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-white bg-blue-500 hover:bg-blue-600 transition-colors px-3 py-1 rounded-lg"
            >
              <Edit2 className="w-3 h-3" /> Update Metrics
            </button>
          )}
          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 px-2 py-1 rounded-lg">
            Manual Entry
          </div>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="mt-6 p-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10">
          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-3">Update Sensor Metrics</h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">Dissolved Oxygen (mg/L)</label>
              <input 
                type="number" step="0.1" min="0" max="20" required
                value={formData.dissolved_oxygen}
                onChange={e => setFormData(p => ({ ...p, dissolved_oxygen: parseFloat(e.target.value) }))}
                className="w-full text-sm rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">Temperature (°C)</label>
              <input 
                type="number" step="0.1" min="0" max="50" required
                value={formData.temperature}
                onChange={e => setFormData(p => ({ ...p, temperature: parseFloat(e.target.value) }))}
                className="w-full text-sm rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">pH Level</label>
              <input 
                type="number" step="0.1" min="0" max="14" required
                value={formData.ph_level}
                onChange={e => setFormData(p => ({ ...p, ph_level: parseFloat(e.target.value) }))}
                className="w-full text-sm rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button 
              type="submit" 
              disabled={updating}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Updates
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-6 mt-6 sm:grid-cols-3">
          {/* DO Gauge */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20">
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" className="text-zinc-200 dark:text-zinc-800" fill="transparent" />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  className={doIsCritical ? "text-red-500" : "text-emerald-500"}
                  fill="transparent"
                  strokeDasharray="251.2"
                  animate={{ strokeDashoffset: 251.2 - (251.2 * Math.min(m.dissolved_oxygen, 14.0)) / 14.0 }}
                  transition={{ duration: 0.8 }}
                />
              </svg>
              <div className={`absolute flex flex-col items-center text-center ${doIsCritical ? "animate-pulse" : ""}`}>
                <Wind className={`h-4 w-4 ${doIsCritical ? "text-red-400" : "text-emerald-400"}`} />
                <span className="text-sm font-black mt-0.5">{m.dissolved_oxygen.toFixed(1)}</span>
                <span className="text-[8px] uppercase tracking-wider text-zinc-500">mg/L</span>
              </div>
            </div>
            <span className="text-xs font-semibold mt-3 text-zinc-700 dark:text-zinc-300">Dissolved Oxygen</span>
            <span className="text-[8px] uppercase text-zinc-500 dark:text-zinc-400 mt-0.5">Optimal: 5.0 - 8.0</span>
            {doIsCritical && (
              <div className="mt-2 text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md animate-bounce">
                DO Critical Shift!
              </div>
            )}
          </div>

          {/* Temp Gauge */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20">
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" className="text-zinc-200 dark:text-zinc-800" fill="transparent" />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  className={tempIsCritical ? "text-red-500 animate-pulse" : "text-emerald-500"}
                  fill="transparent"
                  strokeDasharray="251.2"
                  animate={{ strokeDashoffset: 251.2 - (251.2 * Math.min(m.temperature, 42.0)) / 42.0 }}
                  transition={{ duration: 0.8 }}
                />
              </svg>
              <div className={`absolute flex flex-col items-center text-center ${tempIsCritical ? "animate-pulse" : ""}`}>
                <Thermometer className={`h-4 w-4 ${tempIsCritical ? "text-red-400" : "text-emerald-400"}`} />
                <span className="text-sm font-black mt-0.5">{m.temperature.toFixed(1)}</span>
                <span className="text-[8px] uppercase tracking-wider text-zinc-500">°C</span>
              </div>
            </div>
            <span className="text-xs font-semibold mt-3 text-zinc-700 dark:text-zinc-300">Temperature</span>
            <span className="text-[8px] uppercase text-zinc-500 dark:text-zinc-400 mt-0.5">Optimal: 25 - 30 °C</span>
            {tempIsCritical && (
              <div className="mt-2 text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md animate-bounce">
                Thermal Shock Warning!
              </div>
            )}
          </div>

          {/* pH Gauge */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20">
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" className="text-zinc-200 dark:text-zinc-800" fill="transparent" />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  className={phIsCritical ? "text-red-500" : "text-emerald-500"}
                  fill="transparent"
                  strokeDasharray="251.2"
                  animate={{ strokeDashoffset: 251.2 - (251.2 * Math.min(m.ph_level, 14.0)) / 14.0 }}
                  transition={{ duration: 0.8 }}
                />
              </svg>
              <div className={`absolute flex flex-col items-center text-center ${phIsCritical ? "animate-pulse" : ""}`}>
                <Droplet className={`h-4 w-4 ${phIsCritical ? "text-red-400" : "text-emerald-400"}`} />
                <span className="text-sm font-black mt-0.5">{m.ph_level.toFixed(1)}</span>
                <span className="text-[8px] uppercase tracking-wider text-zinc-500">pH</span>
              </div>
            </div>
            <span className="text-xs font-semibold mt-3 text-zinc-700 dark:text-zinc-300">pH Levels</span>
            <span className="text-[8px] uppercase text-zinc-500 dark:text-zinc-400 mt-0.5">Optimal: 6.5 - 8.5</span>
            {phIsCritical && (
              <div className="mt-2 text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md animate-bounce">
                pH Acidosis / Alkalosis!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
