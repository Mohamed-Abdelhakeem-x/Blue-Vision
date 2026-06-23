"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Coins, Percent, FileText, ArrowRight, Waves, Loader2, Sparkles, Info, Edit2, Check, X } from "lucide-react";
import { getBiAnalytics, downloadTreasureReport, updateMarketPrice } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface BiData {
  total_ponds: number;
  total_biomass_count: number;
  total_estimated_weight_tons: number;
  mortality_rate_percent: number;
  financial_loss_egp: number;
  yield_projections_tons: number;
  disease_trends: Array<{ disease: string; loss_egp: number }>;
  market_price_egp: number;
}

export function OwnerBiDashboard() {
  const [data, setData] = useState<BiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  const loadBiDetails = async () => {
    try {
      setLoading(true);
      const res = await getBiAnalytics();
      setData(res);
    } catch (err) {
      console.error("Error loading BI analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBiDetails();
  }, []);

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      await downloadTreasureReport();
    } catch (err) {
      console.error("Error downloading PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleUpdatePrice = async () => {
    try {
      if (!newPrice || isNaN(Number(newPrice)) || Number(newPrice) < 0) return;
      setUpdatingPrice(true);
      await updateMarketPrice(Number(newPrice));
      setIsEditingPrice(false);
      await loadBiDetails(); // Reload data to get new projections
    } catch (err) {
      console.error("Error updating price:", err);
    } finally {
      setUpdatingPrice(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 bg-zinc-50/50 dark:bg-zinc-950/10 rounded-[1.75rem] border border-[var(--card-border)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const d = data || {
    total_ponds: 3,
    total_biomass_count: 36000,
    total_estimated_weight_tons: 16.2,
    mortality_rate_percent: 3.5,
    financial_loss_egp: 54000,
    yield_projections_tons: 15.6,
    disease_trends: [
      { disease: "Sick / Infected Biomass", loss_egp: 54000 }
    ],
    market_price_egp: 95
  };

  const infectedCount = Math.floor(d.total_biomass_count * (d.mortality_rate_percent / 100));
  const healthyCount = d.total_biomass_count - infectedCount;

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Biomass Analytics (Spans 2 columns, 2 rows internally) */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 relative lg:col-span-2 flex flex-col justify-between">
          
          {/* Top Row */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-tertiary)] flex items-center gap-1.5">
                  Total Fish Count
                  <div className="group relative inline-block">
                    <Info className="h-3 w-3 text-zinc-400 hover:text-blue-500 cursor-help" />
                    <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 opacity-0 transition-opacity group-hover:opacity-100 z-50 rounded-lg bg-zinc-800 dark:bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-200 dark:text-zinc-800 shadow-xl font-normal normal-case tracking-normal text-left">
                      <strong>Total Fish Count:</strong> The estimated total count of living Nile Tilapia across all operational ponds on the farm. The 'Live Weight Est' (measured in Metric Tons, or MT) represents the total mass of these fish if harvested today, which is crucial for forecasting feed requirements and evaluating overall farm productivity.
                    </div>
                  </div>
                </span>
                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1.5">{d.total_biomass_count.toLocaleString()}</h3>
              </div>
              <div className="rounded-xl bg-blue-600/10 p-2.5 text-blue-500 shrink-0">
                <Waves className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2.5">
              <span className="text-[10px] text-zinc-500">Live Weight Est:</span>
              <span className="text-xs font-bold text-blue-500">{d.total_estimated_weight_tons.toFixed(1)} MT</span>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
            {/* Healthy Fish Count */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500 flex items-center gap-1.5">
                Healthy Fish Count
                <div className="group relative inline-block">
                  <Info className="h-3 w-3 opacity-70 hover:opacity-100 cursor-help" />
                  <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/4 mt-2 w-64 opacity-0 transition-opacity group-hover:opacity-100 z-50 rounded-lg bg-zinc-800 dark:bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-200 dark:text-zinc-800 shadow-xl font-normal normal-case tracking-normal text-left">
                    <strong>Healthy Fish Count:</strong> The number of fish estimated to be completely healthy based on the latest AI biological scan data.
                  </div>
                </div>
              </span>
              <h4 className="text-xl font-black text-emerald-500 mt-1">{healthyCount.toLocaleString()}</h4>
            </div>

            {/* Infected Fish Count */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-red-500 flex items-center gap-1.5">
                Infected Fish Count
                <div className="group relative inline-block">
                  <Info className="h-3 w-3 opacity-70 hover:opacity-100 cursor-help" />
                  <div className="pointer-events-none absolute top-full left-1/2 -translate-x-3/4 mt-2 w-64 opacity-0 transition-opacity group-hover:opacity-100 z-50 rounded-lg bg-zinc-800 dark:bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-200 dark:text-zinc-800 shadow-xl font-normal normal-case tracking-normal text-left">
                    <strong>Infected Fish Count:</strong> The number of fish currently showing signs of sickness or pathogen infection according to the latest AI scans.
                  </div>
                </div>
              </span>
              <h4 className="text-xl font-black text-red-500 mt-1">{infectedCount.toLocaleString()}</h4>
            </div>
          </div>

        </div>

        {/* Financial Revenue Loss */}
        <div className="rounded-2xl border border-red-500/20 bg-[var(--card-bg)] p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-red-400 flex items-center gap-1.5">
                Projected Financial Loss
                <div className="group relative inline-block">
                  <Info className="h-3 w-3 opacity-70 hover:opacity-100 cursor-help" />
                  <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 opacity-0 transition-opacity group-hover:opacity-100 z-50 rounded-lg bg-zinc-800 dark:bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-200 dark:text-zinc-800 shadow-xl font-normal normal-case tracking-normal text-left">
                    <strong>Projected Financial Loss:</strong> The estimated revenue loss measured in EGP (Egyptian Pounds). This projection calculates the monetary value of the fish that are currently sick or at risk of dying, based on current market prices and AI-detected infection rates. It highlights the direct financial impact of unmitigated disease.
                  </div>
                </div>
              </span>
              <h3 className="text-2xl font-black text-red-500 mt-1.5">{d.financial_loss_egp.toLocaleString()} EGP</h3>
            </div>
            <div className="rounded-xl bg-red-500/10 p-2.5 text-red-500 shrink-0 animate-pulse">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2.5">
            <span className="text-[10px] text-zinc-500">Market Target:</span>
            {isEditingPrice ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-16 h-6 px-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded focus:outline-none focus:border-blue-500"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  disabled={updatingPrice}
                  autoFocus
                />
                {updatingPrice ? (
                  <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                ) : (
                  <>
                    <button onClick={handleUpdatePrice} className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                      <Check className="h-3 w-3" />
                    </button>
                    <button onClick={() => setIsEditingPrice(false)} className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20">
                      <X className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-red-400">
                  ~{d.market_price_egp} EGP / kg
                </span>
                <button 
                  onClick={() => { setIsEditingPrice(true); setNewPrice(d.market_price_egp.toString()); }}
                  className="p-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 transition-colors flex items-center justify-center border border-amber-500/20 shadow-sm"
                  title="Edit Market Price"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mortality Rate */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-tertiary)] flex items-center gap-1.5">
                Mortality Risk Index
                <div className="group relative inline-block">
                  <Info className="h-3 w-3 text-zinc-400 hover:text-blue-500 cursor-help" />
                  <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 opacity-0 transition-opacity group-hover:opacity-100 z-50 rounded-lg bg-zinc-800 dark:bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-200 dark:text-zinc-800 shadow-xl font-normal normal-case tracking-normal text-left">
                    <strong>Mortality Risk Index:</strong> A predictive metric indicating the percentage of your total fish population that is at high risk of mortality. This index is generated by our AI continuously scanning the ponds for signs of disease and environmental stress. A lower percentage indicates a healthier, more stable environment.
                  </div>
                </div>
              </span>
              <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1.5">{d.mortality_rate_percent.toFixed(1)}%</h3>
            </div>
            <div className="rounded-xl bg-zinc-600/10 p-2.5 text-[var(--text-primary)] shrink-0">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2.5">
            <span className="text-[10px] text-zinc-500">Target Ceiling:</span>
            <span className="text-xs font-bold text-emerald-500">&lt; 5.0%</span>
          </div>
        </div>

        {/* Harvest Yield gauge */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-tertiary)] flex items-center gap-1.5">
                Harvest Yield Forecast
                <div className="group relative inline-block">
                  <Info className="h-3 w-3 text-zinc-400 hover:text-blue-500 cursor-help" />
                  <div className="pointer-events-none absolute top-full right-0 mt-2 w-72 opacity-0 transition-opacity group-hover:opacity-100 z-50 rounded-lg bg-zinc-800 dark:bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-200 dark:text-zinc-800 shadow-xl font-normal normal-case tracking-normal text-left">
                    <strong>Harvest Yield Forecast:</strong> The projected total volume of healthy, market-ready tilapia you can expect to successfully harvest at the end of the current growth cycle. Measured in MT (Metric Tons), this forecast accounts for current biomass and subtracts projected mortality losses to give you a realistic revenue target.
                  </div>
                </div>
              </span>
              <h3 className="text-2xl font-black text-emerald-500 mt-1.5">{d.yield_projections_tons.toFixed(1)} MT</h3>
            </div>
            <div className="rounded-xl bg-emerald-600/10 p-2.5 text-emerald-500 shrink-0">
              <TrendingDown className="h-5 w-5 transform rotate-180" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2.5">
            <span className="text-[10px] text-zinc-500">Pond units:</span>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{d.total_ponds} active</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Disease financial trends breakdown */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 md:col-span-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-1.5">
            Infection Financial Impact Projection
          </h3>
          <div className="space-y-3">
            {d.disease_trends.map((t, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 bg-black/5 dark:bg-white/5 p-3 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-primary)]">{t.disease}</span>
                  <span className="font-black text-red-500">{t.loss_egp.toLocaleString()} EGP</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    style={{ width: `${d.financial_loss_egp > 0 ? (t.loss_egp / d.financial_loss_egp) * 100 : 0}%` }}
                    className="h-full rounded-full bg-red-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The Treasure: PDF download */}
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/5 to-transparent p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-black text-blue-500 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="h-4 w-4" />
              The Treasure Report
            </h3>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              Download your comprehensive, executive-ready monthly PDF report in one-click. Summarizes biomass analytics, water stability indexes, FCR values, and security audit certifications.
            </p>
          </div>
          <Button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-bold transition shadow-md"
          >
            {downloading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching audited PDF…</>
            ) : (
              <><FileText className="h-3.5 w-3.5" /> Download Monthly Report</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
