"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit3, Waves, Grid, Layers, Loader2, Compass, Layers3, X } from "lucide-react";
import { getPonds, createPond, updatePond, deletePond, PondResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";

const POND_TYPES = [
  { value: "Earthen Pond", label: "Earthen Pond (حوض ترابي)", theme: "from-amber-600/20 to-amber-950/40 border-amber-500/30 text-amber-400" },
  { value: "Concrete Tank", label: "Concrete Tank (حوض خرساني)", theme: "from-slate-600/20 to-slate-950/40 border-slate-500/30 text-slate-400" },
  { value: "Floating Cage", label: "Floating Cage (أقفاص سمكية)", theme: "from-cyan-600/20 to-cyan-950/40 border-cyan-500/30 text-cyan-400" },
  { value: "Desert Tank", label: "Desert Tank (حوض صحراوي)", theme: "from-yellow-600/20 to-yellow-950/40 border-yellow-500/30 text-yellow-400" },
  { value: "Lined Pond", label: "Lined Pond (حوض مبطن عزل)", theme: "from-indigo-600/20 to-indigo-950/40 border-indigo-500/30 text-indigo-400" }
];

export function PondManagement({ 
  onPondsUpdated 
}: { 
  onPondsUpdated?: (ponds: PondResponse[]) => void 
}) {
  const [ponds, setPonds] = useState<PondResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPond, setEditingPond] = useState<PondResponse | null>(null);
  
  // Form states
  const [pondType, setPondType] = useState("Earthen Pond");
  const [name, setName] = useState("");
  const [size, setSize] = useState(1200);
  const [submitting, setSubmitting] = useState(false);

  const loadPonds = async () => {
    try {
      setLoading(true);
      const data = await getPonds();
      setPonds(data);
      if (onPondsUpdated) onPondsUpdated(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPonds();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createPond({
        type: pondType,
        name: name.trim() || undefined,
        size_sq_meters: Number(size)
      });
      setShowAddModal(false);
      await loadPonds();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPond) return;
    try {
      setSubmitting(true);
      await updatePond(editingPond.id, {
        type: pondType,
        name: name.trim() || undefined,
        size_sq_meters: Number(size)
      });
      setEditingPond(null);
      await loadPonds();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pondId: string) => {
    if (!confirm("Are you sure you want to delete this pond? All linked telemetry logs will be lost.")) return;
    try {
      await deletePond(pondId);
      await loadPonds();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (pond: PondResponse) => {
    setEditingPond(pond);
    setPondType(pond.type);
    setName(pond.name || "");
    setSize(pond.size_sq_meters || 1200);
  };

  const openAdd = () => {
    setShowAddModal(true);
    setPondType("Earthen Pond");
    setName("");
    setSize(1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-850">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Waves className="h-5 w-5 text-blue-500" />
            Pond System Dashboard
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Monitor and manage Nile Tilapia production units across the farm.
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-4 py-2 text-sm transition shadow-md"
        >
          <Plus className="h-4 w-4" /> Add New Pond
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : ponds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center bg-zinc-50/50 dark:bg-zinc-950/20">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">No ponds registered in this farm yet.</p>
          <Button onClick={openAdd} variant="secondary" className="rounded-xl">Create your first pond</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {ponds.map((p) => {
            const typeInfo = POND_TYPES.find((t) => t.value === p.type) || POND_TYPES[0];
            const sizeM = p.size_sq_meters || 0;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm backdrop-blur transition-all duration-300 hover:shadow-md ${typeInfo.theme}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold tracking-wide">{p.name || p.type}</h3>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{p.name ? `${p.type} • ID: ${p.id.slice(0, 8)}` : `ID: ${p.id.slice(0, 8)}`}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10 transition text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="rounded-lg p-1.5 hover:bg-red-500/10 transition text-zinc-500 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 border-t border-black/5 dark:border-white/5 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400">Dimensions</span>
                    <p className="text-sm font-semibold">{sizeM.toLocaleString()} m²</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingPond) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {editingPond ? "Modify Pond Specs" : "Add Nile Tilapia Pond"}
                </h3>
                <button
                  onClick={() => { setShowAddModal(false); setEditingPond(null); }}
                  className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={editingPond ? handleUpdate : handleAdd} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pond Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Grow-out Pond North"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Structure / Pond Type</label>
                  <select
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                    value={pondType}
                    onChange={(e) => setPondType(e.target.value)}
                  >
                    {POND_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pond Area (m²)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                  />
                </div>

                <div className="bg-blue-500/5 dark:bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    * By saving, a dynamic water sensor telemetry channel is initialized automatically for this pond unit to stream Dissolved Oxygen, Temperature, and pH level readings.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setShowAddModal(false); setEditingPond(null); }}
                    className="rounded-xl py-2 px-4 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                    {editingPond ? "Save Changes" : "Deploy Pond"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
