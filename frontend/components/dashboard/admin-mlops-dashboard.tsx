"use client";

import { useEffect, useState } from "react";
import { Sliders, Cpu, Activity, ShieldCheck, Database, RefreshCw, CheckCircle, Loader2 } from "lucide-react";
import { getAdminAnalytics, getAdminSettings, updateAdminSettings, triggerMlopsRetrain, hotswapModelWeights } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface AdminAnalytics {
  active_users: number;
  organizations: number;
  api_success_rate: number;
  support_sla: number;
  model_accuracy_percent: number;
  false_positive_rate_percent: number;
  confusion_matrix: {
    true_healthy: number;
    false_infected: number;
    true_infected: number;
    false_healthy: number;
  };
  current_sensitivity_threshold: number;
}

export function AdminMloPsDashboard() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Slider state
  const [threshold, setThreshold] = useState(75.0);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // MLOps operations states
  const [retraining, setRetraining] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState("tilapia_v1.5.0.pt");
  const [hotswapping, setHotswapping] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const metrics = await getAdminAnalytics();
      setData(metrics);
      setThreshold(metrics.current_sensitivity_threshold);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleThresholdSave = async () => {
    try {
      setSavingThreshold(true);
      await updateAdminSettings(threshold);
      setStatusMsg(`Sensitivity threshold successfully calibrated to ${threshold}%`);
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleRetrain = async () => {
    try {
      setRetraining(true);
      const res = await triggerMlopsRetrain();
      setStatusMsg(res.message);
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setRetraining(false);
    }
  };

  const handleHotswap = async () => {
    try {
      setHotswapping(true);
      const res = await hotswapModelWeights(selectedWeight);
      setStatusMsg(res.message);
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setHotswapping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-zinc-50/50 dark:bg-zinc-950/10 rounded-[1.75rem] border border-[var(--card-border)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const d = data || {
    active_users: 1284,
    organizations: 37,
    api_success_rate: 99.97,
    support_sla: 94,
    model_accuracy_percent: 98.5,
    false_positive_rate_percent: 1.8,
    confusion_matrix: {
      true_healthy: 952,
      false_infected: 18,
      true_infected: 314,
      false_healthy: 8
    },
    current_sensitivity_threshold: 75.0
  };

  return (
    <div className="space-y-6">
      {/* Global metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Active Engineers & Users</p>
          <p className="mt-3 text-3xl font-black text-zinc-900 dark:text-zinc-100">{d.active_users.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Total Deployments</p>
          <p className="mt-3 text-3xl font-black text-zinc-900 dark:text-zinc-100">{d.organizations} Farms</p>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Inference Success Rate</p>
          <p className="mt-3 text-3xl font-black text-emerald-500">{d.api_success_rate}%</p>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">System SLA Response</p>
          <p className="mt-3 text-3xl font-black text-zinc-900 dark:text-zinc-100">{d.support_sla}% Target</p>
        </div>
      </div>

      {statusMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle className="h-4 w-4" />
          {statusMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Calibration slider */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="h-4 w-4 text-blue-500" />
              Confidence Threshold Calibration
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-5">
              Adjust sensitivity threshold slider for Yolo vision disease detection inference scoring before triggering farm quarantine alerts.
            </p>
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-black">
                <span>Alert Sensitivity:</span>
                <span className="text-blue-500">{threshold}%</span>
              </div>
              <input
                type="range"
                min="35"
                max="95"
                step="5"
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-bold">
                <span>Sensitive (Catch Minor Anomalies)</span>
                <span>Strict (Fewer False Positives)</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleThresholdSave}
            disabled={savingThreshold}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            {savingThreshold && <Loader2 className="h-3 w-3 animate-spin" />}
            Calibrate Alert Limits
          </Button>
        </div>

        {/* Middle Column: Model performance stats */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 uppercase tracking-wider mb-4">
            <Cpu className="h-4 w-4 text-blue-500" />
            Accuracy & Confusion Matrix
          </h3>
          <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
            <div className="bg-emerald-500/5 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] text-emerald-500">True Healthy</span>
              <p className="text-lg font-black text-emerald-400 mt-1">{d.confusion_matrix.true_healthy}</p>
            </div>
            <div className="bg-red-500/5 dark:bg-red-950/10 p-3 rounded-xl border border-red-500/20">
              <span className="text-[10px] text-red-400">False Infected</span>
              <p className="text-lg font-black text-red-400 mt-1">{d.confusion_matrix.false_infected}</p>
            </div>
            <div className="bg-emerald-500/5 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] text-emerald-500">True Infected</span>
              <p className="text-lg font-black text-emerald-400 mt-1">{d.confusion_matrix.true_infected}</p>
            </div>
            <div className="bg-red-500/5 dark:bg-red-950/10 p-3 rounded-xl border border-red-500/20">
              <span className="text-[10px] text-red-400">False Healthy</span>
              <p className="text-lg font-black text-red-400 mt-1">{d.confusion_matrix.false_healthy}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between text-[11px] font-bold border-t border-black/5 dark:border-white/5 pt-2.5">
            <span>Overall Model Accuracy:</span>
            <span className="text-emerald-500">{d.model_accuracy_percent}%</span>
          </div>
        </div>

        {/* Right Column: Weights hotswap & lifecycle */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 uppercase tracking-wider">
              <Database className="h-4 w-4 text-blue-500" />
              MLOps Weights Lifecycle
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-5">
              Hot-swap vision model neural network weights (.pt or .onnx files) live, or trigger automated retraining pipelines.
            </p>
            <div className="pt-2 space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Active Neural Model Weights:</label>
              <select
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-500 font-bold"
                value={selectedWeight}
                onChange={(e) => setSelectedWeight(e.target.value)}
              >
                <option value="tilapia_v1.5.0.pt">tilapia_v1.5.0.pt (Production Active)</option>
                <option value="tilapia_v1.4.2_stable.pt">tilapia_v1.4.2_stable.pt (Fallback)</option>
                <option value="tilapia_v2.0.0-rc2.onnx">tilapia_v2.0.0-rc2.onnx (Release Candidate)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              onClick={handleRetrain}
              disabled={retraining}
              variant="secondary"
              className="rounded-xl py-2 text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
            >
              {retraining ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Retrain Model
            </Button>
            <Button
              onClick={handleHotswap}
              disabled={hotswapping}
              className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-xl py-2 text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
            >
              {hotswapping ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Hot-Swap weights
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
