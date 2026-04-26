"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";

import { signup } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FloatingField } from "@/components/auth/floating-field";



export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setSuccess(false);
    setError(null);

    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      setLoading(false);
      return;
    }

    try {
      await signup({
        email,
        password,
        full_name: username
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 450);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("register.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-90px)] overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-8rem] top-8 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-[-8rem] h-80 w-80 rounded-full bg-zinc-500/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-md flex-col items-center justify-center px-4 py-10">
        {/* Oceanic BlueVision Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col items-center select-none"
        >

          <h1 className="text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-blue-600 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 18px rgba(34,211,238,0.4))" }}>Blue</span>
            <span className="text-white/90" style={{ filter: "drop-shadow(0 0 10px rgba(147,197,253,0.5))" }}>Vision</span>
          </h1>
          <p className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-cyan-400/60">
            <motion.span animate={{ scaleX: [1, 1.6, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-block h-px w-5 bg-gradient-to-r from-transparent to-cyan-400/50" />
            See Deeper · Act Faster
            <motion.span animate={{ scaleX: [1, 1.6, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-block h-px w-5 bg-gradient-to-l from-transparent to-cyan-400/50" />
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }} className="w-full">
          <Card className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7 shadow-[var(--shadow-md)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t("register.title")}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("register.subtitle")}</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <FloatingField
                label={t("common.username")}
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
              <FloatingField
                label={t("common.email")}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <p className="-mt-1 text-xs text-[var(--text-tertiary)]">{t("common.emailHint")}</p>
              <FloatingField
                label={t("common.password")}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <FloatingField
                label={t("common.confirmPassword")}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              <p className="-mt-1 text-xs text-[var(--text-tertiary)]">{t("register.passwordRule")}</p>

              <Button type="submit" className="mt-1 h-11 w-full gap-2 bg-[#2563eb] text-zinc-50 hover:bg-[#1d4ed8] active:scale-[0.98]" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("register.loading")}
                  </>
                ) : success ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t("register.success")}
                  </>
                ) : (
                  <>
                    {t("register.cta")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              {error ? <p className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">{error}</p> : null}
            </form>

            <p className="mt-5 text-sm text-[var(--text-secondary)]">
              {t("register.switchPrompt")} <Link href="/login" className="font-semibold text-[#2563eb] hover:underline">{t("register.switchCta")}</Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
