"use client";

import {ArrowRight, Check, Loader2} from "lucide-react";
import Link from "next/link";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {FormEvent, useState} from "react";
import {motion} from "framer-motion";

import {clearStoredTokens, fetchProfile, login, storeAuthTokens, storeUserRole} from "@/lib/api";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {FloatingField} from "@/components/auth/floating-field";
import {ThemeToggle} from "@/components/ui/theme-toggle";
import {LocaleSwitcher} from "@/components/ui/locale-switcher";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);
    clearStoredTokens();

    try {
      const payload = await login(email, password);
      storeAuthTokens(payload);
      try {
        const profile = await fetchProfile(payload.access_token);
        storeUserRole(profile.role);
      } catch {
        // Ignore profile preload failures; user can still access dashboard.
      }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 450);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-90px)] overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="absolute end-4 top-4 z-50 flex items-center gap-2">
        <ThemeToggle />
        <LocaleSwitcher />
      </div>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-[-9rem] h-80 w-80 rounded-full bg-zinc-500/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-md items-center px-4 py-10">
        <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{duration: 0.35}} className="w-full">
          <Card className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7 shadow-[var(--shadow-md)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t("login.title")}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("login.subtitle")}</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
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
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <p className="-mt-1 text-xs text-[var(--text-tertiary)]">{t("common.passwordHint")}</p>
              <Button type="submit" className="mt-1 h-11 w-full gap-2 bg-[#2563eb] text-zinc-50 hover:bg-[#1d4ed8] active:scale-[0.98]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("login.loading")}
                  </>
                ) : success ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t("login.success")}
                  </>
                ) : (
                  <>
                    {t("login.cta")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              {error ? <p className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">{error}</p> : null}
            </form>

            <p className="mt-5 text-sm text-[var(--text-secondary)]">
              {t("login.switchPrompt")} <Link href="/register" className="font-semibold text-[#2563eb] hover:underline">{t("login.switchCta")}</Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
