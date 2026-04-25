"use client";

import {FormEvent, useState} from "react";
import {ArrowRight, KeyRound, Loader2, ShieldCheck} from "lucide-react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {getStoredAccessToken, redeemRoleByCode, storeUserRole} from "@/lib/api";
import type {UserRole} from "@/lib/types";

function mapRoleElevationError(message: string, t: ReturnType<typeof useTranslations<"authCode">>) {
  if (message === "Invalid authorization code") {
    return t("errors.invalidCode");
  }

  if (message === "Role elevation is disabled") {
    return t("errors.disabled");
  }

  return message;
}

export default function AuthCodePage() {
  const router = useRouter();
  const t = useTranslations("authCode");
  const [code, setCode] = useState("");
  const [role, setRole] = useState<UserRole>("farmer");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!code.trim()) {
      setVerified(false);
      setError(t("errors.missingCode"));
      return;
    }

    setVerified(true);
  };

  const applyRole = async () => {
    setError(null);
    const token = getStoredAccessToken();
    if (!token) {
      setError(t("errors.signInFirst"));
      return;
    }

    setLoading(true);
    try {
      const profile = await redeemRoleByCode({
        token,
        payload: {
          code: code.trim(),
          role
        }
      });
      storeUserRole(profile.role);
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.applyFailed");
      setError(mapRoleElevationError(message, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-90px)] overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-[-9rem] h-80 w-80 rounded-full bg-zinc-500/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-md items-center px-4 py-10">
        <Card className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7 shadow-[var(--shadow-md)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            <KeyRound className="h-3.5 w-3.5" />
            {t("badge")}
          </div>

          <h1 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{t("title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("subtitle")}</p>

          <form onSubmit={unlock} className="mt-5 space-y-4">
            <label className="block text-sm text-[var(--text-secondary)]">
              {t("codeLabel")}
              <input
                type="password"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 text-[var(--text-primary)] outline-none transition focus:border-blue-600/60 focus:ring-2 focus:ring-blue-600/20"
                placeholder={t("codePlaceholder")}
                required
              />
            </label>
            <Button type="submit" className="h-11 w-full gap-2">
              {t("unlock")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {verified ? (
            <div className="mt-6 space-y-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] p-4">
              <label className="block text-sm text-[var(--text-secondary)]">
                {t("roleLabel")}
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-[var(--text-primary)] outline-none transition focus:border-blue-600/60 focus:ring-2 focus:ring-blue-600/20"
                >
                  <option value="farmer">{t("roles.farmer")}</option>
                  <option value="expert">{t("roles.expert")}</option>
                  <option value="admin">{t("roles.admin")}</option>
                  <option value="developer">{t("roles.developer")}</option>
                </select>
              </label>
              <Button type="button" className="h-11 w-full gap-2" onClick={applyRole}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("applying")}
                  </>
                ) : (
                  <>
                    {t("apply")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          ) : null}

          {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}

          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("helper")}
          </div>
        </Card>
      </div>
    </main>
  );
}
